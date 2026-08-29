/**
 * Everything `make docs-check` checks before a build is allowed to be published.
 *
 *   tsx scripts/validate.ts [--drafts]
 *
 * <p>Each check is a function returning problems. They all run — a validator that stops at
 * the first failure makes a contributor fix one thing at a time — and the exit code is
 * non-zero if any of them found something.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import fg from 'fast-glob';
import { navigation, site as loadSite, strings as loadStrings, versions as loadVersions } from './lib/config.ts';
import { plan } from './lib/pages.ts';
import { contentRoot, docsRoot, distRoot } from './lib/paths.ts';
import { convert } from './lib/asciidoc.ts';
import { repoRoot } from './lib/paths.ts';

interface Problem {
  check: string;
  where: string;
  message: string;
  hint?: string;
}

const site = loadSite();
const versionConfig = loadVersions();
const nav = navigation();
const languages = site.languages.published.map((language) => language.code);
const includeDrafts = process.argv.includes('--drafts');

const problems: Problem[] = [];
const report = (check: string, where: string, message: string, hint?: string) =>
  problems.push({ check, where, message, hint });

const relDocs = (path: string) => relative(docsRoot, path);

// --------------------------------------------------------------------------------------
// 1. Every navigation entry has a page, in every language
// --------------------------------------------------------------------------------------

const checkNavigation = (): void => {
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();

  const walk = (nodes: typeof nav, parentSlug: string): void => {
    for (const node of nodes) {
      if (seenIds.has(node.id)) {
        report('navigation', 'navigation/nav.yml', `duplicate navigation id "${node.id}"`);
      }
      seenIds.add(node.id);

      const slug = [parentSlug, node.slug].filter(Boolean).join('/');
      if (node.page) {
        if (seenSlugs.has(slug)) {
          report('navigation', 'navigation/nav.yml', `two pages resolve to the same URL "${slug}"`);
        }
        seenSlugs.add(slug);
      }
      if (!node.page && (node.children ?? []).length === 0) {
        report(
          'navigation',
          'navigation/nav.yml',
          `"${node.id}" has neither a page nor children, so it would draw an empty group`,
        );
      }
      walk(node.children ?? [], slug);
    }
  };
  walk(nav, '');
};

// --------------------------------------------------------------------------------------
// 2. Localization parity
// --------------------------------------------------------------------------------------

/** Files a language may be missing on purpose. */
const exceptions = (): Set<string> => {
  const file = join(docsRoot, 'content', 'translation-exceptions.txt');
  if (!existsSync(file)) return new Set();
  return new Set(
    readFileSync(file, 'utf8')
      .split('\n')
      .map((line) => line.split('#')[0]!.trim())
      .filter(Boolean),
  );
};

const checkParity = (): void => {
  const allowed = exceptions();
  const source = languages[0]!;

  // Every navigation page exists in every language.
  for (const language of languages) {
    for (const page of plan(nav, language)) {
      if (!page.exists && !allowed.has(`content/${language}/assemblies/${page.page}.adoc`)) {
        report(
          'localization',
          `content/${language}/assemblies/${page.page}.adoc`,
          `the navigation entry "${page.id}" has no page in ${language}`,
          `create it, or list the path in content/translation-exceptions.txt`,
        );
      }
    }
  }

  // Every module and snippet has a counterpart in every other language.
  for (const kind of ['modules', 'assemblies', 'snippets', 'data'] as const) {
    for (const language of languages) {
      const directory = join(contentRoot, language, kind);
      if (!existsSync(directory)) continue;
      const files = fg.sync('**/*.{adoc,yml}', { cwd: directory });
      for (const file of files) {
        // Generated snippets are produced per language by the build, not authored.
        if (file.startsWith('generated/')) continue;
        for (const other of languages) {
          if (other === language) continue;
          const counterpart = join(contentRoot, other, kind, file);
          const shown = `content/${other}/${kind}/${file}`;
          if (!existsSync(counterpart) && !allowed.has(shown)) {
            report(
              'localization',
              `content/${language}/${kind}/${file}`,
              `no ${other} counterpart`,
              `expected ${shown}`,
            );
          }
        }
      }
    }
  }

  // Every hand-written description file answers the same set of keys in every language.
  const dataDir = (language: string) => join(contentRoot, language, 'data');
  if (existsSync(dataDir(source))) {
    for (const file of readdirSync(dataDir(source))) {
      const keysOf = (language: string): string[] => {
        const path = join(dataDir(language), file);
        if (!existsSync(path)) return [];
        return readFileSync(path, 'utf8')
          .split('\n')
          .filter((line) => /^\S/.test(line) && line.includes(':'))
          .map((line) => line.split(':')[0]!.trim());
      };
      const reference = new Set(keysOf(source));
      for (const language of languages.slice(1)) {
        const mine = new Set(keysOf(language));
        for (const key of reference) {
          if (!mine.has(key)) {
            report('localization', `content/${language}/data/${file}`, `missing description for "${key}"`);
          }
        }
        for (const key of mine) {
          if (!reference.has(key)) {
            report('localization', `content/${language}/data/${file}`, `describes "${key}", which ${source} does not`);
          }
        }
      }
    }
  }

  // Every shell string exists in every language.
  const reference = loadStrings(source);
  for (const language of languages.slice(1)) {
    const mine = loadStrings(language);
    for (const key of Object.keys(reference)) {
      if (!(key in mine)) report('localization', `locales/${language}.yml`, `missing string "${key}"`);
    }
    for (const key of Object.keys(mine)) {
      if (!(key in reference)) report('localization', `locales/${language}.yml`, `extra string "${key}"`);
    }
  }
};

// --------------------------------------------------------------------------------------
// 3. Includes and cross-references resolve
// --------------------------------------------------------------------------------------

const checkIncludes = (): void => {
  for (const file of fg.sync(`${contentRoot}/*/{assemblies,modules}/*.adoc`)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/^include::([^[\]]+)\[/gm)) {
      const target = join(dirname(file), match[1]!);
      if (!existsSync(target)) {
        report('includes', relDocs(file), `include not found: ${match[1]}`);
      }
    }
    for (const match of source.matchAll(/^image::?([^[\]]+)\[/gm)) {
      const target = join(dirname(file), '..', 'images', match[1]!);
      if (!existsSync(target)) {
        report('images', relDocs(file), `image not found: ${match[1]}`);
      }
    }
  }
};

const checkCrossReferences = async (): Promise<void> => {
  for (const language of languages) {
    const pages = plan(nav, language);
    const known = new Map(pages.map((page) => [page.id, page]));
    const anchors = new Set<string>();
    const broken: { page: string; target: string }[] = [];

    // First pass: collect every anchor the language defines.
    for (const page of pages) {
      if (!page.exists) continue;
      const document = await convert(page.file, {
        language,
        strings: loadStrings(language),
        repoRoot,
        contentRoot: join(contentRoot, language),
        resolveXref: () => '#',
        attributes: { 'product-name': site.product.name },
      });
      for (const heading of document.headings) anchors.add(`${page.id}#${heading.id}`);
      if (document.status === 'draft' && !includeDrafts) {
        report('status', relDocs(page.file), 'draft pages are excluded from a production build', 'remove :page-status: draft, or run with --drafts');
      }
    }

    // Second pass: resolve every reference against the pages and the anchors.
    for (const page of pages) {
      if (!page.exists) continue;
      await convert(page.file, {
        language,
        strings: loadStrings(language),
        repoRoot,
        contentRoot: join(contentRoot, language),
        attributes: { 'product-name': site.product.name },
        resolveXref: (target) => {
          const [rawPage, anchor] = target.replace(/\.adoc$/, '').split('#');
          const pageId = rawPage || page.id;
          if (!known.has(pageId)) return undefined;
          if (anchor && !anchors.has(`${pageId}#${anchor}`)) return undefined;
          return '#';
        },
        onBrokenXref: (target) => broken.push({ page: page.page, target }),
      });
    }

    for (const entry of broken) {
      report(
        'xref',
        `content/${language}/assemblies/${entry.page}.adoc`,
        `cross-reference does not resolve: ${entry.target}`,
        'the page id must be a navigation entry, and the anchor a heading in it',
      );
    }
  }
};

// --------------------------------------------------------------------------------------
// 4. Modular documentation conventions
// --------------------------------------------------------------------------------------

const checkModularConventions = (): void => {
  for (const language of languages) {
    for (const file of fg.sync(`${contentRoot}/${language}/modules/*.adoc`)) {
      const name = basename(file);
      if (!/^(con|proc|ref)_/.test(name)) {
        report('modular', relDocs(file), 'a module filename must start with con_, proc_ or ref_');
      }
      const source = readFileSync(file, 'utf8');
      if (!/^\[id="[^"]+_\{context\}"\]/m.test(source)) {
        report('modular', relDocs(file), 'a module needs [id="…_{context}"] so it can be included twice');
      }
      if (!/^= /m.test(source)) report('modular', relDocs(file), 'a module needs a title');
    }
    for (const file of fg.sync(`${contentRoot}/${language}/assemblies/*.adoc`)) {
      const source = readFileSync(file, 'utf8');
      if (!/^:context: /m.test(source)) {
        report('modular', relDocs(file), 'an assembly must set :context:');
      }
      if (!/^:description: /m.test(source)) {
        report('modular', relDocs(file), 'an assembly needs :description: — it is the card text and the meta description');
      }
      if (!/^\[id="[^"]+"\]/m.test(source)) {
        report('modular', relDocs(file), 'an assembly needs [id="…"], which is what the language switcher maps on');
      }
    }
  }
};

// --------------------------------------------------------------------------------------
// 5. Nothing private leaks into the sources
// --------------------------------------------------------------------------------------

const checkNoLocalPaths = (): void => {
  const home = process.env.HOME;
  const targets = [
    ...fg.sync(`${contentRoot}/**/*.adoc`),
    ...fg.sync(`${distRoot}/**/*.{html,json,xml,txt}`),
  ];
  for (const file of targets) {
    const source = readFileSync(file, 'utf8');
    if (home && source.includes(home)) {
      report('privacy', relDocs(file), `contains an absolute path from the machine that built it`);
    }
    // A value that looks like a credential must never reach a page.
    for (const match of source.matchAll(/(?:password|secret|token|api[-_]?key)\s*[=:]\s*["']?([^\s"'<>{}]{8,})/gi)) {
      const value = match[1]!;
      // A placeholder is a placeholder whether or not the page escaped its angle bracket.
      if (/^([<$]|&lt;|&#x3C;|&#60;)/i.test(value)) continue;
      if (/redacted|example|placeholder|changeme|xxxx/i.test(value)) continue;
      if (/^(the|a|an|your|its)$/i.test(value)) continue;
      report('privacy', relDocs(file), `a credential-shaped literal: ${match[0]!.slice(0, 48)}…`, 'use a <placeholder>');
    }
  }
};

// --------------------------------------------------------------------------------------
// 6. Interface labels
// --------------------------------------------------------------------------------------

/**
 * Every `*bold*` string in the content, checked against what the interface actually says.
 *
 * <p>This is the check that cannot be done by reading. A procedure quotes a label; somebody
 * renames that label in `frontend/locales/`; the documentation is now wrong and nothing about
 * it looks wrong. Worse in Turkish, where a reviewer who does not have both files open cannot
 * tell "Yayımla" from "Yayınla".
 *
 * <p>Bold is also used for emphasis, so an exact miss cannot fail on its own. What fails is a
 * *near* miss: a string close enough to a real label that it was plainly meant to be one.
 */
const checkInterfaceLabels = (): void => {
  const frontendLocales = join(repoRoot, 'keydra-frontend', 'locales');
  if (!existsSync(frontendLocales)) return;

  // How similar two strings are, 0..1, by the longest common subsequence of their words.
  const similarity = (a: string, b: string): number => {
    const x = [...a];
    const y = [...b];
    const table: number[][] = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
    for (let i = 1; i <= x.length; i += 1) {
      for (let j = 1; j <= y.length; j += 1) {
        table[i]![j] = x[i - 1] === y[j - 1] ? table[i - 1]![j - 1]! + 1 : Math.max(table[i - 1]![j]!, table[i]![j - 1]!);
      }
    }
    return (2 * table[x.length]![y.length]!) / (x.length + y.length || 1);
  };

  // `{{count}}` in the interface and `{count}` in the documentation are the same slot.
  const slot = (value: string) => value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, '{$1}').trim();

  for (const language of languages) {
    const file = join(frontendLocales, language, 'public.json');
    if (!existsSync(file)) continue;

    const flat: Record<string, string> = {};
    const walk = (node: unknown, prefix: string): void => {
      if (typeof node === 'string') flat[prefix] = node;
      else if (node && typeof node === 'object') {
        for (const [key, value] of Object.entries(node)) walk(value, prefix ? `${prefix}.${key}` : key);
      }
    };
    walk(JSON.parse(readFileSync(file, 'utf8')), '');

    const byText = new Map<string, string>();
    for (const [key, value] of Object.entries(flat)) {
      if (!byText.has(slot(value))) byText.set(slot(value), key);
    }
    const known = [...byText.keys()];

    for (const source of fg.sync(`${contentRoot}/${language}/{assemblies,modules}/*.adoc`)) {
      const lines = readFileSync(source, 'utf8').split('\n');
      lines.forEach((line, index) => {
        if (/^([:/]|----)/.test(line.trim())) return;
        for (const match of line.matchAll(/(?<![\w*])\*([^*\n]{4,80})\*(?![\w*])/g)) {
          const quoted = slot(match[1]!);
          if (byText.has(quoted)) return;
          let best = '';
          let score = 0;
          for (const candidate of known) {
            const value = similarity(quoted, candidate);
            if (value > score) {
              score = value;
              best = candidate;
            }
          }
          // 0.82 separates "meant to be this label and got it wrong" from "an ordinary
          // word that happens to share letters with one" — but only once a string is long
          // enough for that ratio to mean anything. In a short one a single letter is a
          // fifth of the word, and Turkish makes whole words out of a suffix: *Başarılı*
          // (successful) scores 0.87 against the label "Başarısız" (failed), which is the
          // opposite word rather than a misquotation of it. Below that length the bar is
          // one typo's worth of difference and no more.
          const shortest = Math.min(quoted.length, best.length);
          if (score >= (shortest < 12 ? 0.92 : 0.82)) {
            report(
              'ui-labels',
              `${relDocs(source)}:${index + 1}`,
              `"${match[1]}" is not what the interface says`,
              `${byText.get(best)} reads "${best}"`,
            );
          }
        }
      });
    }
  }
};

// --------------------------------------------------------------------------------------
// 7. Terminology
// --------------------------------------------------------------------------------------

const checkTerminology = (): void => {
  const glossaryFile = join(docsRoot, 'glossary');
  if (!existsSync(glossaryFile)) return;
  const banned: Record<string, string> = {
    'Key Dra': 'Keydra',
    KeyDra: 'Keydra',
    keydra: 'Keydra (at the start of a sentence)',
    'Redis Cluster': 'a Redis cluster',
    'Valkey Cluster': 'a Valkey cluster',
  };
  for (const file of fg.sync(`${contentRoot}/**/*.adoc`)) {
    const source = readFileSync(file, 'utf8');
    source.split('\n').forEach((line, index) => {
      // Code, attributes and comments are not prose.
      if (/^[:/]/.test(line.trim()) || line.trim().startsWith('----')) return;
      for (const [wrong, right] of Object.entries(banned)) {
        if (wrong === 'keydra') {
          if (/(^|\.\s+)keydra\b/.test(line)) {
            report('terminology', `${relDocs(file)}:${index + 1}`, `"keydra" at the start of a sentence`, `use ${right}`);
          }
          continue;
        }
        if (line.includes(wrong)) {
          report('terminology', `${relDocs(file)}:${index + 1}`, `"${wrong}"`, `use ${right}`);
        }
      }
    });
  }
};

// --------------------------------------------------------------------------------------
// 7. The built site, when there is one
// --------------------------------------------------------------------------------------

const checkBuiltSite = (): void => {
  if (!existsSync(distRoot)) return;
  const pages = fg.sync(`${distRoot}/**/index.html`);
  if (pages.length === 0) {
    report('build', 'dist/', 'no pages were built');
    return;
  }

  for (const file of pages) {
    const html = readFileSync(file, 'utf8');
    const where = relative(distRoot, file);

    if (!/^<!doctype html>/i.test(html)) report('html', where, 'no doctype');
    // A redirect stub is three tags and a canonical link. It is not a page and has no
    // description to check — `latest` is a tree of them by design.
    if (html.includes('http-equiv="refresh"')) continue;
    if (!/<html lang="(en|tr)"/.test(html)) report('html', where, 'no lang attribute on <html>');
    if (!/<title>[^<]+<\/title>/.test(html)) report('html', where, 'no title');
    if (!/<meta name="description" content="[^"]+"/.test(html)) report('html', where, 'no meta description');

    // Unresolved AsciiDoc must never reach a reader. Documented examples live inside a
    // code block, so only text outside <pre> is checked.
    const prose = html.replace(/<pre[\s\S]*?<\/pre>/g, ' ').replace(/<code[\s\S]*?<\/code>/g, ' ');
    for (const leak of ['include::', 'ifdef::', 'ifndef::', 'xref:']) {
      if (prose.includes(leak)) report('html', where, `unresolved AsciiDoc in the rendered page: ${leak}`);
    }
    // An attribute nobody defined renders as {name}.
    const unresolved = [...prose.matchAll(/\{([a-z][a-z0-9-]{2,})\}/g)].map((m) => m[1]!);
    const allowed = new Set(['count', 'name', 'total', 'sampled', 'seconds', 'value', 'what', 'from', 'into', 'restored', 'skipped', 'failed', 'migrated', 'scanned', 'ms', 'limit', 'duration', 'used', 'reading', 'match', 'index', 'ago', 'when', 'who', 'roles', 'fingerprint', 'percent', 'bytes', 'keys', 'size', 'removed', 'language', 'version', 'ranges', 'address', 'missing', 'title', 'href', 'key', 'up', 'running', 'due', 'handled', 'metric', 'comparison', 'threshold', 'target']);
    for (const attribute of unresolved) {
      if (!allowed.has(attribute)) {
        report('html', where, `looks like an undefined attribute: {${attribute}}`);
        break;
      }
    }
  }

  // Search indexes exist, carry the right language, and survive Turkish characters.
  for (const index of fg.sync(`${distRoot}/**/search-index.json`)) {
    const payload = JSON.parse(readFileSync(index, 'utf8')) as {
      language: string;
      version: string;
      pages: { id: string; title: string; body: string }[];
    };
    const where = relative(distRoot, index);
    if (payload.pages.length === 0) report('search', where, 'the index is empty');
    if (payload.language === 'tr') {
      const text = payload.pages.map((page) => `${page.title} ${page.body}`).join(' ');
      if (!/[çğıİöşü]/.test(text)) {
        report('search', where, 'the Turkish index carries no Turkish characters — an encoding problem');
      }
    }
    for (const page of payload.pages) {
      if (!page.title) report('search', where, `a page with no title: ${page.id}`);
    }
  }
};

// --------------------------------------------------------------------------------------

const run = async (): Promise<void> => {
  checkNavigation();
  checkParity();
  checkIncludes();
  checkModularConventions();
  await checkCrossReferences();
  checkInterfaceLabels();
  checkTerminology();
  checkNoLocalPaths();
  checkBuiltSite();

  const byCheck = new Map<string, Problem[]>();
  for (const problem of problems) {
    byCheck.set(problem.check, [...(byCheck.get(problem.check) ?? []), problem]);
  }

  const checks = [
    'navigation',
    'localization',
    'includes',
    'images',
    'modular',
    'xref',
    'status',
    'ui-labels',
    'terminology',
    'privacy',
    'html',
    'search',
    'build',
  ];

  for (const check of checks) {
    const found = byCheck.get(check) ?? [];
    const mark = found.length === 0 ? '  ok ' : ' fail';
    console.log(`${mark}  ${check}${found.length ? ` — ${found.length}` : ''}`);
    for (const problem of found.slice(0, 25)) {
      console.log(`        ${problem.where}: ${problem.message}`);
      if (problem.hint) console.log(`           → ${problem.hint}`);
    }
    if (found.length > 25) console.log(`        … and ${found.length - 25} more`);
  }

  const counted = statSync(distRoot, { throwIfNoEntry: false })
    ? fg.sync(`${distRoot}/**/index.html`).length
    : 0;
  console.log('');
  console.log(
    `  ${languages.length} languages, ${versionConfig.versions.length} version(s), ${counted} built pages`,
  );

  if (problems.length > 0) {
    console.log(`\n  ${problems.length} problem(s)\n`);
    process.exitCode = 1;
  } else {
    console.log('\n  no problems\n');
  }
};

await run();
