/**
 * Derive what Keydra actually is from the Keydra source tree.
 *
 * <p>Everything factual in the reference documentation — the configuration properties,
 * the environment variables, the permissions, the endpoints, the interface labels — is
 * read from here rather than typed by a person, because a person typing a default value
 * is a person whose copy of it goes stale on the next commit.
 *
 * <p>Writes `.generated/source-inventory.json`. That file is git-ignored: it is derived,
 * it is regenerated on every build, and it carries no secret — values that look like a
 * credential are replaced with a placeholder before they are written.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import fg from 'fast-glob';
import {
  backendRoot,
  frontendRoot,
  generatedRoot,
  repoRoot,
  repoRelative,
} from './lib/paths.ts';
import {
  allowedRoles,
  annotationBlock,
  annotationValue,
  backendSources,
  enumConstants,
  hasAnnotation,
  javadocBefore,
  namedStringArgument,
  readJava,
  requiredPermission,
  withoutComments,
} from './lib/java.ts';

// --------------------------------------------------------------------------------------
// Shapes
// --------------------------------------------------------------------------------------

export interface Endpoint {
  method: string;
  path: string;
  resource: string;
  /** The OpenAPI tag the resource carries, which is how the reference is grouped. */
  tag: string;
  tagDescription?: string;
  javaMethod: string;
  /** The action name recorded in the audit log, when the endpoint is audited. */
  audited?: string;
  /** The permission the interceptor requires, or undefined when the guard is a role. */
  permission?: string;
  roles?: string[];
  open: boolean;
  summary?: string;
  source: string;
  line: number;
}

export interface GraphQlOperation {
  kind: 'query' | 'mutation' | 'subscription';
  name: string;
  type: string;
  permission?: string;
  roles?: string[];
  summary?: string;
  source: string;
  line: number;
}

export interface ConfigProperty {
  name: string;
  /** '' for the default profile, otherwise 'dev' | 'test' | 'prod'. */
  profile: string;
  raw: string;
  /** The environment variable a deployment sets, when the value reads one. */
  env?: string;
  default?: string;
  sensitive: boolean;
  source: string;
  line: number;
}

export interface PermissionEntry {
  constant: string;
  id: string;
  level: string;
  summary?: string;
}

export interface RouteEntry {
  path: string;
  component: string;
  titleKey: string;
  navKey?: string;
  icon?: string;
  requiresPermission?: string;
  scope: 'global' | 'connection';
}

// --------------------------------------------------------------------------------------
// Secrets never travel
// --------------------------------------------------------------------------------------

const SECRET_NAME = /(password|secret|token|api[-_.]?key|credential|passphrase|private[-_.]?key)/i;

/**
 * A value that belongs to a name that sounds like a secret is not written out.
 *
 * <p>The development configuration in this repository contains real local passwords. A
 * generated inventory is an artefact that gets read, diffed and occasionally pasted into
 * an issue, so the rule is that it never carries one — not even a development one, which
 * is the password somebody reuses.
 */
const redact = (name: string, value: string | undefined): string | undefined => {
  if (value === undefined || value === '') return value;
  if (!SECRET_NAME.test(name)) return value;
  return '<redacted>';
};

// --------------------------------------------------------------------------------------
// Backend: REST
// --------------------------------------------------------------------------------------

const HTTP_VERBS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const joinPaths = (base: string, sub: string | undefined): string => {
  if (!sub || sub === '/') return base;
  return `${base.replace(/\/$/, '')}/${sub.replace(/^\//, '')}`;
};

const scanRest = (): Endpoint[] => {
  const endpoints: Endpoint[] = [];

  for (const path of backendSources()) {
    const file = readJava(path);
    const clean = withoutComments(file.source);
    const lines = clean.split('\n');
    const originalLines = file.source.split('\n');

    const classMatch =
      /@Path\s*\(\s*"((?:[^"\\]|\\.)*)"\s*\)[\s\S]{0,600}?\b(?:public\s+)?class\s+(\w+)/.exec(clean);
    if (!classMatch) continue;
    const base = classMatch[1]!;
    const resource = classMatch[2]!;
    if (!base.startsWith('/api')) continue;

    const classLine = lineAtOffset(clean, classMatch.index) - 1;
    const classBlock = annotationBlock(lines, classLine);
    const classRoles = allowedRoles(classBlock);
    const tag = namedStringArgument(classBlock, 'Tag', 'name') ?? resource;
    const tagDescription = namedStringArgument(classBlock, 'Tag', 'description');

    lines.forEach((line, index) => {
      const verb = new RegExp(`^\\s*@(${HTTP_VERBS.join('|')})\\s*$`).exec(line);
      if (!verb) return;
      const block = annotationBlock(lines, index);
      // The signature is the first line after the block that declares a method.
      let signature = '';
      for (let i = index + 1; i < lines.length && i < index + 40; i += 1) {
        const candidate = lines[i]!;
        if (/\w+\s*\(/.test(candidate) && !candidate.trim().startsWith('@')) {
          signature = candidate;
          break;
        }
      }
      const roles = allowedRoles(block);
      endpoints.push({
        method: verb[1]!,
        path: joinPaths(base, annotationValue(block, 'Path')),
        resource,
        tag,
        tagDescription,
        javaMethod: /\s(\w+)\s*\(/.exec(signature)?.[1] ?? '',
        permission: requiredPermission(block),
        roles: roles.length ? roles : classRoles.length ? classRoles : undefined,
        audited: annotationValue(block, 'Audited'),
        open: hasAnnotation(block, 'PermitAll'),
        summary:
          namedStringArgument(block, 'Operation', 'summary') ??
          javadocBefore(originalLines.slice(0, index).join('\n') + '\n', originalLines.slice(0, index).join('\n').length + 1),
        source: file.relative,
        line: index + 1,
      });
    });
  }
  return endpoints.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
};

/** 1-based line number of a character offset. */
const lineAtOffset = (source: string, offset: number): number =>
  source.slice(0, offset).split('\n').length;

// --------------------------------------------------------------------------------------
// Backend: GraphQL
// --------------------------------------------------------------------------------------

const scanGraphQl = (): GraphQlOperation[] => {
  const operations: GraphQlOperation[] = [];
  const kinds: Record<string, GraphQlOperation['kind']> = {
    Query: 'query',
    Mutation: 'mutation',
    Subscription: 'subscription',
  };

  for (const path of fg.sync('src/main/java/**/graphql/*.java', { cwd: backendRoot, absolute: true })) {
    const file = readJava(path);
    const clean = withoutComments(file.source);
    const lines = clean.split('\n');
    const type = basename(path, '.java');

    lines.forEach((line, index) => {
      const match = /^\s*@(Query|Mutation|Subscription)\s*\(\s*"([^"]+)"\s*\)/.exec(line);
      if (!match) return;
      const block = annotationBlock(lines, index);
      const roles = allowedRoles(block);
      operations.push({
        kind: kinds[match[1]!]!,
        name: match[2]!,
        type,
        permission: requiredPermission(block),
        roles: roles.length ? roles : undefined,
        summary: namedStringArgument(block, 'Description', '') ?? annotationValue(block, 'Description'),
        source: file.relative,
        line: index + 1,
      });
    });
  }
  return operations.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
};

// --------------------------------------------------------------------------------------
// Backend: configuration
// --------------------------------------------------------------------------------------

const scanConfiguration = (): ConfigProperty[] => {
  const path = join(backendRoot, 'src/main/resources/application.properties');
  const source = readFileSync(path, 'utf8');
  const relative = repoRelative(path);
  const properties: ConfigProperty[] = [];

  source.split('\n').forEach((line, index) => {
    const match = /^\s*(%(\w+)\.)?([\w."'\-\[\]{}$:/]+?)\s*=\s*(.*)$/.exec(line);
    if (!match || line.trimStart().startsWith('#')) return;
    const name = match[3]!;
    const raw = match[4]!;
    // `${ENV_NAME:default}` is Quarkus' way of saying "a deployment sets this".
    const env = /\$\{([A-Z][A-Z0-9_]*)(?::([\s\S]*))?\}/.exec(raw);
    properties.push({
      name,
      profile: match[2] ?? '',
      raw: redact(name, raw)!,
      env: env?.[1],
      default: redact(name, env ? env[2] : raw),
      sensitive: SECRET_NAME.test(name),
      source: relative,
      line: index + 1,
    });
  });
  return properties;
};

// --------------------------------------------------------------------------------------
// Backend: enumerations worth documenting
// --------------------------------------------------------------------------------------

const readEnum = (relativePath: string): PermissionEntry[] | { name: string; summary?: string }[] => {
  const absolute = join(backendRoot, relativePath);
  if (!existsSync(absolute)) return [];
  const file = readJava(absolute);
  return enumConstants(file.source).map((constant) => {
    const at = file.source.indexOf(constant.name);
    return { name: constant.name, summary: javadocBefore(file.source, at) };
  });
};

const scanPermissions = (): PermissionEntry[] => {
  const file = readJava(join(backendRoot, 'src/main/java/io/keydra/authz/entity/Permission.java'));
  return enumConstants(file.source).map((constant) => {
    const id = /"([^"]+)"/.exec(constant.args)?.[1] ?? constant.name.toLowerCase();
    const level = /Level\.(\w+)/.exec(constant.args)?.[1] ?? 'UNKNOWN';
    const at = file.source.indexOf(`${constant.name}(`);
    return { constant: constant.name, id, level, summary: javadocBefore(file.source, at) };
  });
};

const scanConstantsClass = (relativePath: string): { name: string; value: string; summary?: string }[] => {
  const absolute = join(backendRoot, relativePath);
  if (!existsSync(absolute)) return [];
  const file = readJava(absolute);
  const found: { name: string; value: string; summary?: string }[] = [];
  const pattern = /public\s+static\s+final\s+String\s+(\w+)\s*=\s*"([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(file.source)) !== null) {
    found.push({ name: match[1]!, value: match[2]!, summary: javadocBefore(file.source, match.index) });
  }
  return found;
};

// --------------------------------------------------------------------------------------
// Frontend
// --------------------------------------------------------------------------------------

const scanRoutes = (): RouteEntry[] => {
  const source = readFileSync(join(frontendRoot, 'src/app/routes.tsx'), 'utf8');
  const routes: RouteEntry[] = [];

  const readArray = (name: string, scope: RouteEntry['scope']) => {
    const start = source.indexOf(`export const ${name}`);
    if (start < 0) return;
    // `= [` rather than the first `[`: the declaration's type annotation is
    // `NavigableRoute[]`, and matching that bracket finds an empty array immediately.
    const open = source.indexOf('= [', start) + 2;
    let depth = 0;
    let end = open;
    for (let i = open; i < source.length; i += 1) {
      if (source[i] === '[') depth += 1;
      else if (source[i] === ']') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    const body = source.slice(open + 1, end);
    for (const entry of body.split(/\n\s*\{\n/).slice(1)) {
      const field = (key: string) => new RegExp(`\\b${key}:\\s*'([^']+)'`).exec(entry)?.[1];
      const bare = (key: string) => new RegExp(`\\b${key}:\\s*([\\w.]+)`).exec(entry)?.[1];
      const path = field('path');
      if (!path) continue;
      routes.push({
        path,
        component: bare('component') ?? '',
        titleKey: field('title') ?? '',
        navKey: field('label'),
        icon: bare('icon'),
        requiresPermission: bare('requiresPermission'),
        scope,
      });
    }
  };

  readArray('connectionRoutes', 'connection');
  readArray('routes', 'global');
  return routes;
};

/** Every interface string, in every published language, flattened to dotted keys. */
const scanUiLabels = (): Record<string, Record<string, string>> => {
  const labels: Record<string, Record<string, string>> = {};
  for (const language of ['en', 'tr']) {
    const file = join(frontendRoot, 'locales', language, 'public.json');
    if (!existsSync(file)) continue;
    const flat: Record<string, string> = {};
    const walk = (node: unknown, prefix: string) => {
      if (typeof node === 'string') {
        flat[prefix] = node;
        return;
      }
      if (node && typeof node === 'object') {
        for (const [key, value] of Object.entries(node)) {
          walk(value, prefix ? `${prefix}.${key}` : key);
        }
      }
    };
    walk(JSON.parse(readFileSync(file, 'utf8')), '');
    labels[language] = flat;
  }
  return labels;
};

// --------------------------------------------------------------------------------------
// Versions
// --------------------------------------------------------------------------------------

const git = (...args: string[]): string => {
  try {
    return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

const scanVersions = () => {
  const pom = readFileSync(join(backendRoot, 'pom.xml'), 'utf8');
  const frontendPackage = JSON.parse(readFileSync(join(frontendRoot, 'package.json'), 'utf8'));
  return {
    backend: /<artifactId>keydra-backend<\/artifactId>\s*<version>([^<]+)</.exec(pom)?.[1] ?? '',
    frontend: frontendPackage.version as string,
    quarkus: /<quarkus\.platform\.version>([^<]+)</.exec(pom)?.[1] ?? '',
    java: /<maven\.compiler\.release>([^<]+)</.exec(pom)?.[1] ?? '',
    node: readFileSync(join(frontendRoot, '.nvmrc'), 'utf8').trim(),
    patternfly: (frontendPackage.dependencies?.['@patternfly/react-core'] ?? '') as string,
    react: (frontendPackage.dependencies?.react ?? '') as string,
    vite: (frontendPackage.devDependencies?.vite ?? '') as string,
    typescript: (frontendPackage.devDependencies?.typescript ?? '') as string,
    packageManager: (frontendPackage.packageManager ?? '') as string,
    tags: git('tag', '--list').split('\n').filter(Boolean),
    describe: git('describe', '--tags', '--always', '--dirty'),
    commit: git('rev-parse', '--short', 'HEAD'),
  };
};

// --------------------------------------------------------------------------------------

export const buildInventory = () => {
  const inventory = {
    generatedFrom: 'the Keydra source tree; see scripts/build-inventory.ts',
    versions: scanVersions(),
    backend: {
      restResources: [...new Set(scanRest().map((e) => e.resource))].sort(),
      websockets: (() => {
        const sockets: { path: string; source: string }[] = [];
        for (const path of backendSources()) {
          const file = readJava(path);
          const match = /@WebSocket\s*\(\s*path\s*=\s*"([^"]+)"/.exec(withoutComments(file.source));
          if (match) sockets.push({ path: match[1]!, source: file.relative });
        }
        return sockets.sort((a, b) => a.path.localeCompare(b.path));
      })(),
    },
    api: {
      rest: scanRest(),
      graphql: scanGraphQl(),
    },
    configuration: scanConfiguration(),
    security: {
      permissions: scanPermissions(),
      builtInRoles: readEnum('src/main/java/io/keydra/authz/entity/BuiltInRole.java'),
    },
    features: {
      engineTypes: readEnum('src/main/java/io/keydra/engine/EngineType.java'),
      connectionTypes: readEnum('src/main/java/io/keydra/connections/entity/ConnectionType.java'),
      backupDestinationKinds: readEnum('src/main/java/io/keydra/backup/entity/DestinationKind.java'),
      alertDeliveryKinds: readEnum('src/main/java/io/keydra/alerts/entity/DeliveryKind.java'),
      alertMetrics: readEnum('src/main/java/io/keydra/alerts/entity/AlertMetric.java'),
      scheduleJobTypes: readEnum('src/main/java/io/keydra/schedule/entity/JobType.java'),
      notificationCategories: scanConstantsClass(
        'src/main/java/io/keydra/events/dto/NotificationCategory.java',
      ),
      valueDecoders: fg
        .sync('src/main/java/io/keydra/values/decoder/*Decoder.java', { cwd: backendRoot })
        .map((p) => basename(p, '.java'))
        .filter((n) => n !== 'ValueDecoder' && n !== 'DecoderChain')
        .sort(),
    },
    frontend: {
      routes: scanRoutes(),
      uiLabelCount: Object.fromEntries(
        Object.entries(scanUiLabels()).map(([language, labels]) => [language, Object.keys(labels).length]),
      ),
    },
    uiLabels: scanUiLabels(),
  };

  mkdirSync(generatedRoot, { recursive: true });
  writeFileSync(join(generatedRoot, 'source-inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);
  return inventory;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const inventory = buildInventory();
  const counts = [
    ['REST endpoints', inventory.api.rest.length],
    ['GraphQL operations', inventory.api.graphql.length],
    ['configuration properties', inventory.configuration.length],
    ['permissions', inventory.security.permissions.length],
    ['frontend routes', inventory.frontend.routes.length],
    ['interface strings (en)', inventory.frontend.uiLabelCount.en ?? 0],
    ['interface strings (tr)', inventory.frontend.uiLabelCount.tr ?? 0],
  ] as const;
  for (const [what, howMany] of counts) console.log(`  ${String(howMany).padStart(5)}  ${what}`);
  console.log(`\n  written to .generated/source-inventory.json`);
}
