/**
 * AsciiDoc that nobody types.
 *
 * <p>The configuration table, the permission table, the endpoint list, the feature
 * enumerations: every one of them is a fact about the Keydra source tree, and a fact
 * copied by hand into a table is a fact that stops being true. These are written into
 * `content/<lang>/snippets/generated/` and pulled into hand-written reference modules with
 * `include::`, so the prose around a table is reviewed and the table itself is derived.
 *
 * <p>What a property *means* still has to be written by a person, and is, in
 * `content/<lang>/data/*.yml` — one description per language, joined here. A property with
 * no description is listed with an empty cell and reported by `make docs-check`, which is
 * how a new configuration option makes itself known to whoever writes the documentation.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';
import { contentRoot, docsRoot } from './lib/paths.ts';
import { site as loadSite } from './lib/config.ts';

type Inventory = ReturnType<typeof import('./build-inventory.ts').buildInventory>;

const LANGUAGES = ['en', 'tr'] as const;

/** Descriptions a person wrote, keyed by the thing they describe. */
const descriptions = (language: string, file: string): Record<string, string> => {
  const path = join(contentRoot, language, 'data', `${file}.yml`);
  if (!existsSync(path)) return {};
  return (load(readFileSync(path, 'utf8')) as Record<string, string>) ?? {};
};

/** Table headings, per language. Kept here rather than in the shell strings: they belong
 *  to the generated tables and are read while writing them. */
const HEADINGS: Record<string, Record<string, string>> = {
  en: {
    property: 'Property',
    env: 'Environment variable',
    default: 'Default',
    description: 'Description',
    profile: 'Profile',
    permission: 'Permission',
    scope: 'Scope',
    role: 'Role',
    method: 'Method',
    path: 'Path',
    guard: 'Required',
    summary: 'What it does',
    name: 'Name',
    kind: 'Kind',
    category: 'Category',
    metric: 'Metric',
    unit: 'Unit',
    operation: 'Operation',
    type: 'Type',
    none: 'None',
    signedIn: 'Being signed in',
    open: 'Open to anybody',
    instance: 'Instance',
    connection: 'Target',
    all: 'all profiles',
    sensitive: 'Holds a secret. Never logged, never returned by the API.',
    undocumented: '—',
  },
  tr: {
    property: 'Özellik',
    env: 'Ortam değişkeni',
    default: 'Varsayılan',
    description: 'Açıklama',
    profile: 'Profil',
    permission: 'İzin',
    scope: 'Kapsam',
    role: 'Rol',
    method: 'Yöntem',
    path: 'Yol',
    guard: 'Gereken',
    summary: 'Ne yapar',
    name: 'Ad',
    kind: 'Tür',
    category: 'Kategori',
    metric: 'Ölçüm',
    unit: 'Birim',
    operation: 'İşlem',
    type: 'Tip',
    none: 'Yok',
    signedIn: 'Oturum açmış olmak',
    open: 'Herkese açık',
    instance: 'Örnek',
    connection: 'Hedef',
    all: 'bütün profiller',
    sensitive: 'Bir sır tutar. Günlüğe yazılmaz, API tarafından döndürülmez.',
    undocumented: '—',
  },
};

/** An environment variable whose value is a credential. */
const SECRET_LOOKING = /(PASSWORD|SECRET|TOKEN|API_KEY|KEY$)/;

/** Escape a value that goes into an AsciiDoc table cell. */
const cell = (value: string): string => value.replace(/\|/g, '\\|').replace(/\n/g, ' ');

const mono = (value: string): string => (value ? `\`${cell(value)}\`` : '');

/** Escape text that goes inside an HTML attribute or element in a passthrough. */
const escapeAttribute = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const table = (
  columns: string,
  headings: string[],
  rows: string[][],
  options: { caption?: string } = {},
): string =>
  [
    options.caption ? `.${options.caption}` : '',
    `[cols="${columns}",options="header",role="kd-generated"]`,
    '|===',
    headings.map((heading) => `| ${heading}`).join(' '),
    '',
    ...rows.map((row) => `${row.map((value) => `| ${value}`).join('\n')}\n`),
    '|===',
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');

const banner = (language: string): string =>
  language === 'tr'
    ? [
        '////',
        'ÜRETİLMİŞ DOSYA — elle düzenlemeyin.',
        'scripts/build-generated-content.ts tarafından Keydra kaynak ağacından üretilir.',
        'Açıklama metinleri content/tr/data/ altındaki YAML dosyalarından gelir; değişiklik oraya yazılır.',
        '////',
        '',
      ].join('\n')
    : [
        '////',
        'GENERATED FILE — do not edit.',
        'Written by scripts/build-generated-content.ts from the Keydra source tree.',
        'The descriptions come from the YAML files under content/en/data/; edit those.',
        '////',
        '',
      ].join('\n');

// --------------------------------------------------------------------------------------

export const writeGeneratedSnippets = (inventory: Inventory): void => {
  const site = loadSite();

  for (const language of LANGUAGES) {
    const heading = HEADINGS[language]!;
    const outputDir = join(contentRoot, language, 'snippets', 'generated');
    mkdirSync(outputDir, { recursive: true });
    const put = (name: string, body: string) =>
      writeFileSync(join(outputDir, name), `${banner(language)}${body}`);

    // --- Configuration ------------------------------------------------------------
    const configText = descriptions(language, 'configuration');
    const documented = inventory.configuration.filter(
      (property) => property.name.startsWith('keydra.') || configText[property.name],
    );
    // One row per property name; a property that also appears under a profile says so.
    const byName = new Map<string, typeof documented>();
    for (const property of documented) {
      byName.set(property.name, [...(byName.get(property.name) ?? []), property]);
    }
    put(
      'configuration-table.adoc',
      table(
        '2,2,1,3',
        [heading.property!, heading.env!, heading.default!, heading.description!],
        [...byName.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, entries]) => {
            const base = entries.find((entry) => entry.profile === '') ?? entries[0]!;
            const profiles = entries
              .filter((entry) => entry.profile !== '')
              .map((entry) => entry.profile);
            const description = configText[name] ?? heading.undocumented!;
            // A passthrough rather than an inline role: a table cell parses
            // `[.kd-note]#…#` at the start of a line as a block attribute list, and the
            // role leaks into the page as literal text.
            const note = (text: string) => ` +\npass:[<span class="kd-note">${escapeAttribute(text)}</span>]`;
            const extra = profiles.length ? note(`${heading.profile}: ${profiles.join(', ')}`) : '';
            const secret = base.sensitive ? note(heading.sensitive!) : '';
            return [
              mono(name),
              base.env ? mono(base.env) : '',
              base.default === undefined || base.default === '' ? '' : mono(base.default),
              `${cell(description)}${extra}${secret}`,
            ];
          }),
      ),
    );

    // --- Environment variables ----------------------------------------------------
    const envText = descriptions(language, 'environment');
    const envs = new Map<string, { property: string; fallback: string }>();
    for (const property of inventory.configuration) {
      if (!property.env) continue;
      if (!envs.has(property.env)) {
        envs.set(property.env, {
          property: property.name,
          fallback: property.default ?? '',
        });
      }
    }
    put(
      'environment-table.adoc',
      table(
        '2,2,1,3',
        [heading.env!, heading.property!, heading.default!, heading.description!],
        [...envs.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, entry]) => [
            mono(name),
            mono(entry.property),
            entry.fallback ? mono(entry.fallback) : '',
            cell(envText[name] ?? configText[entry.property] ?? heading.undocumented!),
          ]),
      ),
    );

    // --- Environment variables a deployment sets, grouped by purpose -----------------
    //
    // The reference table lists everything alphabetically, which answers "what does this
    // do". A deployment asks the other question — "what do I have to decide" — and that
    // wants them in groups, with the value a production profile actually starts from.
    const GROUPS: { id: string; env: string[] }[] = [
      {
        id: 'required',
        env: ['KEYDRA_DB_URL', 'KEYDRA_DB_USERNAME', 'KEYDRA_DB_PASSWORD', 'KEYDRA_SECRET_KEY'],
      },
      {
        id: 'address',
        env: [
          'KEYDRA_PUBLIC_URL',
          'KEYDRA_BEHIND_PROXY',
          'KEYDRA_TRUSTED_PROXIES',
          'KEYDRA_CSP',
          'KEYDRA_MAX_BODY_SIZE',
          'KEYDRA_ACCESS_LOG',
        ],
      },
      {
        id: 'security',
        env: [
          'KEYDRA_SECURITY_ENABLED',
          'KEYDRA_COOKIE_SECURE',
          'KEYDRA_SOCKET_ORIGIN_CHECK',
          'KEYDRA_SOCKET_ORIGINS',
          'KEYDRA_SIGN_IN_THROTTLE',
          'KEYDRA_GEOIP_DATABASE',
          'KEYDRA_SESSION_SWEEP_INTERVAL',
          'KEYDRA_INVITATION_VALID_FOR',
          'KEYDRA_PREVIOUS_SECRET_KEYS',
        ],
      },
      {
        id: 'egress',
        env: [
          'KEYDRA_EGRESS_ALLOW_PRIVATE',
          'KEYDRA_EGRESS_ALLOW_LOOPBACK',
          'KEYDRA_EGRESS_ALLOWED_HOSTS',
        ],
      },
      {
        id: 'oidc',
        env: [
          'KEYDRA_OIDC_URL',
          'KEYDRA_OIDC_CLIENT_ID',
          'KEYDRA_OIDC_SECRET',
          'KEYDRA_OIDC_ROLES_CLAIM',
        ],
      },
      {
        id: 'instances',
        env: [
          'KEYDRA_INSTANCE_ID',
          'KEYDRA_STORE_URL',
          'KEYDRA_LEASE_SECONDS',
          'KEYDRA_RECONCILE_SECONDS',
        ],
      },
      {
        id: 'mail',
        env: [
          'KEYDRA_MAIL_HOST',
          'KEYDRA_MAIL_PORT',
          'KEYDRA_MAIL_TLS',
          'KEYDRA_MAIL_USERNAME',
          'KEYDRA_MAIL_API_KEY',
          'KEYDRA_MAIL_FROM',
        ],
      },
      {
        id: 'storage',
        env: [
          'KEYDRA_BACKUP_DIR',
          'KEYDRA_CLICKHOUSE_ENABLED',
          'KEYDRA_CLICKHOUSE_URL',
          'KEYDRA_CLICKHOUSE_USER',
          'KEYDRA_CLICKHOUSE_PASSWORD',
        ],
      },
      { id: 'observability', env: ['KEYDRA_OTLP_ENDPOINT', 'KEYDRA_JSON_LOGS'] },
    ];

    // What a packaged runtime starts from: the %prod line where there is one, otherwise
    // the unprofiled one. Quoting a development default on a deployment page is how
    // somebody ends up with ClickHouse "enabled by default".
    const prodDefault = (name: string): { property: string; value: string } | undefined => {
      const all = inventory.configuration.filter((property) => property.env === name);
      if (all.length === 0) return undefined;
      // One variable can set more than one property — `KEYDRA_INSTANCE_ID` names the
      // instance *and* stamps it on every JSON log line. The application's own property
      // is the one this page is about; the log field's fallback of `unnamed` is a fact
      // about a log line rather than about the setting, and quoting it as the default
      // says the instance id defaults to "unnamed", which it does not.
      const keydraOwn = all.filter((property) => property.name.startsWith('keydra.'));
      const candidates = keydraOwn.length > 0 ? keydraOwn : all;
      const chosen =
        candidates.find((property) => property.profile === 'prod') ??
        candidates.find((property) => property.profile === '') ??
        candidates[0]!;
      return { property: chosen.name, value: chosen.default ?? '' };
    };

    const groupHeadings = descriptions(language, 'deployment-groups');
    put(
      'deployment-environment.adoc',
      GROUPS.map((group) =>
        table(
          // A wider default column than the alphabetical reference has: these are the
          // values somebody is comparing their own against, and a URL broken across four
          // lines is not a value anybody can read.
          '2,2,4',
          [heading.env!, heading.default!, heading.description!],
          group.env.map((name) => {
            const found = prodDefault(name);
            const description =
              envText[name] ?? (found ? configText[found.property] : undefined) ?? heading.undocumented!;
            const secret = SECRET_LOOKING.test(name)
              ? ` +\npass:[<span class="kd-note">${escapeAttribute(heading.sensitive!)}</span>]`
              : '';
            return [
              mono(name),
              found && found.value !== '' ? mono(found.value.length > 40 ? `${found.value.slice(0, 40)}…` : found.value) : '',
              `${cell(description)}${secret}`,
            ];
          }),
          { caption: groupHeadings[group.id] ?? group.id },
        ),
      ).join('\n'),
    );

    // --- Permissions ---------------------------------------------------------------
    const permissionText = descriptions(language, 'permissions');
    put(
      'permissions-table.adoc',
      table(
        '2,1,4',
        [heading.permission!, heading.scope!, heading.description!],
        inventory.security.permissions.map((permission) => [
          mono(permission.id),
          permission.level === 'INSTANCE' ? heading.instance! : heading.connection!,
          cell(permissionText[permission.id] ?? permission.summary ?? heading.undocumented!),
        ]),
      ),
    );

    // --- Which built-in role holds which permission -------------------------------
    const roleNames = inventory.security.builtInRoles.map((role) =>
      String((role as { name: string }).name).toLowerCase(),
    );
    put(
      'roles-table.adoc',
      table(
        '2,4',
        [heading.role!, heading.description!],
        inventory.security.builtInRoles.map((role) => {
          const name = String((role as { name: string }).name).toLowerCase();
          return [
            mono(name),
            cell(
              descriptions(language, 'roles')[name] ??
                String((role as { summary?: string }).summary ?? heading.undocumented!),
            ),
          ];
        }),
      ),
    );
    void roleNames;

    // --- REST endpoints, grouped by their OpenAPI tag ------------------------------
    const byTag = new Map<string, typeof inventory.api.rest>();
    for (const endpoint of inventory.api.rest) {
      byTag.set(endpoint.tag, [...(byTag.get(endpoint.tag) ?? []), endpoint]);
    }
    const guard = (endpoint: (typeof inventory.api.rest)[number]): string => {
      if (endpoint.permission) {
        const id = inventory.security.permissions.find(
          (permission) => permission.constant === endpoint.permission,
        )?.id;
        return mono(id ?? endpoint.permission);
      }
      if (endpoint.open) return heading.open!;
      if (endpoint.roles?.length) return endpoint.roles.map((role) => mono(role.toLowerCase())).join(', ');
      return heading.signedIn!;
    };
    put(
      'rest-endpoints.adoc',
      [...byTag.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([tag, endpoints]) =>
          table(
            '1,3,2,4',
            [heading.method!, heading.path!, heading.guard!, heading.summary!],
            endpoints.map((endpoint) => [
              mono(endpoint.method),
              mono(endpoint.path),
              guard(endpoint),
              cell(endpoint.summary ?? ''),
            ]),
            { caption: tag },
          ),
        )
        .join('\n'),
    );

    // --- GraphQL -------------------------------------------------------------------
    const gqlGuard = (operation: (typeof inventory.api.graphql)[number]): string => {
      if (operation.permission) {
        const id = inventory.security.permissions.find(
          (permission) => permission.constant === operation.permission,
        )?.id;
        return mono(id ?? operation.permission);
      }
      if (operation.roles?.length)
        return operation.roles.map((role) => mono(role.toLowerCase())).join(', ');
      return heading.signedIn!;
    };
    put(
      'graphql-operations.adoc',
      (['query', 'mutation', 'subscription'] as const)
        .map((kind) => {
          const operations = inventory.api.graphql.filter((operation) => operation.kind === kind);
          if (operations.length === 0) return '';
          return table(
            '2,2,4',
            [heading.operation!, heading.guard!, heading.summary!],
            operations.map((operation) => [
              mono(operation.name),
              gqlGuard(operation),
              cell(operation.summary ?? ''),
            ]),
            { caption: kind },
          );
        })
        .filter(Boolean)
        .join('\n'),
    );

    // --- Notification categories ---------------------------------------------------
    const notificationText = descriptions(language, 'notifications');
    put(
      'notification-categories.adoc',
      table(
        '2,4',
        [heading.category!, heading.description!],
        inventory.features.notificationCategories.map((category) => [
          mono(category.value),
          cell(notificationText[category.value] ?? category.summary ?? heading.undocumented!),
        ]),
      ),
    );

    // --- Enumerations a reader chooses from ----------------------------------------
    const enumTable = (
      key: keyof Inventory['features'],
      dataFile: string,
      caption?: string,
    ): string => {
      const text = descriptions(language, dataFile);
      const entries = inventory.features[key] as { name: string; summary?: string }[];
      return table(
        '2,4',
        [heading.name!, heading.description!],
        entries.map((entry) => [
          mono(entry.name),
          cell(text[entry.name] ?? entry.summary ?? heading.undocumented!),
        ]),
        caption ? { caption } : {},
      );
    };

    put('backup-destination-kinds.adoc', enumTable('backupDestinationKinds', 'backup-kinds'));
    put('alert-delivery-kinds.adoc', enumTable('alertDeliveryKinds', 'alert-delivery-kinds'));
    put('alert-metrics.adoc', enumTable('alertMetrics', 'alert-metrics'));
    put('schedule-job-types.adoc', enumTable('scheduleJobTypes', 'job-types'));
    put('connection-types.adoc', enumTable('connectionTypes', 'connection-types'));
    // The engine is a different axis from the arrangement: which protocol the store
    // speaks, rather than how many machines it is. Generated from `io.keydra.engine`, so
    // a page cannot go on saying "RESP only" after a second engine has landed.
    put('engine-types.adoc', enumTable('engineTypes', 'engine-types'));

    // --- Value decoders -------------------------------------------------------------
    const decoderText = descriptions(language, 'decoders');
    put(
      'value-decoders.adoc',
      table(
        '2,4',
        [heading.name!, heading.description!],
        inventory.features.valueDecoders.map((decoder) => {
          const id = decoder.replace(/Decoder$/, '');
          return [mono(id), cell(decoderText[id] ?? heading.undocumented!)];
        }),
      ),
    );

    // --- WebSocket endpoints ---------------------------------------------------------
    const socketText = descriptions(language, 'sockets');
    put(
      'websocket-endpoints.adoc',
      table(
        '3,4',
        [heading.path!, heading.description!],
        inventory.backend.websockets.map((socket) => [
          mono(socket.path),
          cell(socketText[socket.path] ?? heading.undocumented!),
        ]),
      ),
    );

    // --- Versions the documentation quotes --------------------------------------------
    put(
      'versions.adoc',
      [
        `:generated-keydra-version: ${inventory.versions.backend}`,
        `:generated-quarkus-version: ${inventory.versions.quarkus}`,
        `:generated-java-version: ${inventory.versions.java}`,
        `:generated-node-version: ${inventory.versions.node}`,
        `:generated-patternfly-version: ${inventory.versions.patternfly}`,
        `:generated-react-version: ${inventory.versions.react}`,
        `:generated-vite-version: ${inventory.versions.vite}`,
        `:generated-typescript-version: ${inventory.versions.typescript}`,
        `:generated-package-manager: ${inventory.versions.packageManager}`,
        `:generated-rest-endpoints: ${inventory.api.rest.length}`,
        `:generated-graphql-operations: ${inventory.api.graphql.length}`,
        `:generated-permissions: ${inventory.security.permissions.length}`,
        '',
      ].join('\n'),
    );
  }

  void site;
};
