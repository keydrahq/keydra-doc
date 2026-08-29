/**
 * Build the documentation site.
 *
 *   tsx scripts/build.ts [--language en|tr] [--version 0.1] [--base-path /keydra/]
 *                        [--base-url https://…] [--drafts] [--no-assets]
 *
 * <p>One tree per language per version, all of them under one `dist/`. Everything the
 * browser needs is produced here: the pages, the search indexes, the stylesheet, the one
 * enhancement bundle, the fonts, the sitemap and the 404s. Nothing is fetched at run time
 * and nothing is rendered in the browser.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { build as viteBuild } from 'vite';
import { Document } from '../renderer/src/layouts/Document.tsx';
import type { PageModel } from '../renderer/src/types/index.ts';
import { convert, decodeEntities, type ConvertedDocument } from './lib/asciidoc.ts';
import { navigation, site as loadSite, strings as loadStrings, urls, versions as loadVersions } from './lib/config.ts';
import type { Language, VersionEntry } from './lib/config.ts';
import { highlight, unknownLanguages } from './lib/highlight.ts';
import { buildNav, crumbsFor, plan, type PlannedPage } from './lib/pages.ts';
import { contentRoot, distRoot, docsRoot, repoRoot, requireSource } from './lib/paths.ts';
import { buildInventory } from './build-inventory.ts';
import { writeGeneratedSnippets } from './build-generated-content.ts';
import { fold, tokenise } from '../renderer/src/search/normalise.ts';

// --------------------------------------------------------------------------------------
// Arguments
// --------------------------------------------------------------------------------------

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 ? argv[at + 1] : undefined;
};
const has = (name: string): boolean => argv.includes(`--${name}`);

const includeDrafts = has('drafts');

// --------------------------------------------------------------------------------------

requireSource();

const site = loadSite();
if (flag('base-path')) site.product.basePath = flag('base-path')!;
if (flag('base-url')) site.product.baseUrl = flag('base-url')!;
// A site served from a repository that is itself called "docs" wants no second `docs`
// segment. `--docs-prefix ""` removes it, and every URL follows.
if (argv.includes('--docs-prefix')) site.output.docsPrefix = flag('docs-prefix') ?? '';

const versionConfig = loadVersions();
const nav = navigation();
const url = urls(site);

const onlyLanguage = flag('language');
const languages: Language[] = site.languages.published.filter(
  (language) => !onlyLanguage || language.code === onlyLanguage,
);
const onlyVersion = flag('version');
const buildVersions: VersionEntry[] = versionConfig.versions.filter(
  (version) => !onlyVersion || version.id === onlyVersion,
);

if (languages.length === 0) throw new Error(`No such language: ${onlyLanguage}`);
if (buildVersions.length === 0) throw new Error(`No such version: ${onlyVersion}`);

const note = (message: string) => console.log(`  ${message}`);

// --------------------------------------------------------------------------------------
// The inventory, and the reference content derived from it
// --------------------------------------------------------------------------------------

note('reading the Keydra source tree');
const inventory = buildInventory();
writeGeneratedSnippets(inventory);

// --------------------------------------------------------------------------------------
// Convert every page, for every language and version
// --------------------------------------------------------------------------------------

interface BuiltPage {
  planned: PlannedPage;
  document: ConvertedDocument;
  language: Language;
  version: VersionEntry;
  html: string;
}

const brokenXrefs: { page: string; target: string }[] = [];
const converted = new Map<string, BuiltPage>();
/** language:version -> the page ids that exist there, for the switchers. */
const known = new Map<string, Set<string>>();

const anchorsById = new Map<string, string>();

for (const version of buildVersions) {
  for (const language of languages) {
    const pages = plan(nav, language.code);
    const seen = new Set<string>();
    known.set(`${language.code}:${version.id}`, seen);

    for (const planned of pages) {
      if (!planned.exists) continue;
      const document = await convert(planned.file, {
        language: language.code,
        strings: loadStrings(language.code),
        repoRoot,
        contentRoot: join(contentRoot, language.code),
        attributes: {
          'product-name': site.product.name,
          'product-version': version.keydraVersion,
          'docs-version': version.id,
          lang: language.code,
          'keydra-repo': site.product.repository,
          'quarkus-version': inventory.versions.quarkus,
          'java-version': inventory.versions.java,
          'node-version': inventory.versions.node,
          'patternfly-version': inventory.versions.patternfly,
          'react-version': inventory.versions.react,
          'image-registry': site.product.images.registry,
          'image-standalone': `${site.product.images.registry}/${site.product.images.standalone}`,
          'image-backend': `${site.product.images.registry}/${site.product.images.backend}`,
          'image-ui': `${site.product.images.registry}/${site.product.images.ui}`,
          'image-tag': site.product.images.tag,
          'backend-port': '8181',
          'frontend-port': '9000',
          // Screenshots resolve against the language's own image directory, which is
          // copied per language and per version above. A page at /docs/tr/latest/console/
          // would otherwise ask for console/konsol.jpg, and a Turkish page would have no
          // way to reach a Turkish screenshot at all.
          imagesdir: url.page(language.code, version.id, 'images').replace(/\/$/, ''),
        },
        resolveXref: (target) => {
          // `xref:page-id.adoc#anchor` and `xref:page-id[]` both resolve against the
          // navigation, so a link survives a page moving to a different section.
          const [rawPage, anchor] = target.replace(/\.adoc$/, '').split('#');
          const pageId = rawPage || planned.id;
          const found = pages.find((candidate) => candidate.id === pageId);
          if (found) return `${url.page(language.code, version.id, found.slug)}${anchor ? `#${anchor}` : ''}`;
          // An anchor with no page is a section inside this one.
          if (!rawPage && anchor) return `#${anchor}`;
          return undefined;
        },
        onBrokenXref: (target) => brokenXrefs.push({ page: `${language.code}/${planned.page}`, target }),
      });

      if (document.status === 'draft' && !includeDrafts) continue;

      converted.set(`${language.code}:${version.id}:${planned.id}`, {
        planned,
        document,
        language,
        version,
        html: document.html,
      });
      seen.add(planned.id);
      for (const heading of document.headings) {
        anchorsById.set(`${language.code}:${version.id}:${planned.id}#${heading.id}`, heading.text);
      }
    }
  }
}

note(`converted ${converted.size} pages`);

// --------------------------------------------------------------------------------------
// Highlight
// --------------------------------------------------------------------------------------

for (const built of converted.values()) {
  built.html = await highlight(built.html);
}
if (unknownLanguages.size > 0) {
  note(`no grammar for: ${[...unknownLanguages].join(', ')} — those blocks render unhighlighted`);
}

// --------------------------------------------------------------------------------------
// Assets
// --------------------------------------------------------------------------------------

const assetDir = join(distRoot, 'assets');

const buildAssets = async (): Promise<{ css: string[]; js: string[] }> => {
  const result = await viteBuild({
    root: docsRoot,
    configFile: false,
    logLevel: 'warn',
    // Everything Vite emits lives under `assets/`, and the fonts PatternFly's stylesheet
    // reaches for are among them. Without this the `url()` in the bundled CSS resolves
    // against the site root and every typeface 404s — which is invisible in a build log
    // and obvious the moment somebody loads a page.
    base: url.asset(''),
    build: {
      outDir: assetDir,
      emptyOutDir: true,
      // The page addresses assets through `url.asset()`, so Vite only needs to name them.
      assetsDir: '.',
      // A documentation page is read, not stepped through. Shipping maps would publish
      // the build machine's paths, which §144 and §145 both forbid.
      sourcemap: false,
      rollupOptions: {
        input: {
          docs: join(docsRoot, 'renderer/src/styles/entry.ts'),
        },
        output: {
          entryFileNames: '[name].[hash].js',
          chunkFileNames: '[name].[hash].js',
          assetFileNames: '[name].[hash][extname]',
        },
      },
    },
  });

  const output = Array.isArray(result) ? result[0]! : (result as { output: unknown[] });
  const files = (output as { output: { fileName: string; type: string }[] }).output.map(
    (chunk) => chunk.fileName,
  );
  return {
    css: files.filter((file) => file.endsWith('.css')).map((file) => url.asset(file)),
    js: files.filter((file) => file.endsWith('.js') && file.startsWith('docs')).map((file) => url.asset(file)),
  };
};

rmSync(distRoot, { recursive: true, force: true });
mkdirSync(distRoot, { recursive: true });

note('bundling the stylesheet and the enhancement script');
const assets = has('no-assets') ? { css: [], js: [] } : await buildAssets();

// PatternFly ships the Red Hat typefaces; copying them beside the stylesheet is what
// makes the site work with no network at all.
const fontSource = join(docsRoot, 'node_modules/@patternfly/patternfly/assets/fonts');
if (existsSync(fontSource)) {
  cpSync(fontSource, join(assetDir, 'fonts'), { recursive: true });
}

// The favicon is the repository's own adaptive icon.
const faviconSource = join(repoRoot, 'logo/keydra-icon-adaptive.svg');
const favicon = url.asset('favicon.svg');
if (existsSync(faviconSource)) cpSync(faviconSource, join(assetDir, 'favicon.svg'));

// --------------------------------------------------------------------------------------
// Render
// --------------------------------------------------------------------------------------

const write = (relativePath: string, body: string): void => {
  const target = join(distRoot, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, body);
};

/** The dist-relative path an address resolves to, with no file name assumed. */
const fileFor = (href: string): string =>
  href.startsWith(url.base) ? href.slice(url.base.length) : href;

/** The dist-relative file a page address writes to. */
const pathFor = (href: string): string => join(fileFor(href), 'index.html');

// Images travel with their language, so a screenshot of a Turkish interface stays in the
// Turkish tree rather than being shared with a page that shows an English one.
//
// Below `fileFor` rather than above it: a `const` arrow is not hoisted, and while both
// image directories were empty the guard meant nothing ever reached the call to notice.
for (const language of languages) {
  const images = join(contentRoot, language.code, 'images');
  if (existsSync(images) && readdirSync(images).length > 0) {
    for (const version of buildVersions) {
      cpSync(images, join(distRoot, fileFor(url.page(language.code, version.id, 'images'))), {
        recursive: true,
      });
    }
  }
}

const sitemapEntries: { loc: string; alternates: { lang: string; href: string }[] }[] = [];

for (const version of buildVersions) {
  for (const language of languages) {
    const strings = loadStrings(language.code);
    const pages = plan(nav, language.code).filter((planned) =>
      converted.has(`${language.code}:${version.id}:${planned.id}`),
    );
    const titles = {
      byId: new Map(
        pages.map((planned) => [
          planned.id,
          converted.get(`${language.code}:${version.id}:${planned.id}`)!.document.title,
        ]),
      ),
    };
    const href = (slug: string) => url.page(language.code, version.id, slug);
    const home = url.page(language.code, version.id, '');

    const searchDocuments: Record<string, string>[] = [];

    pages.forEach((planned, index) => {
      const built = converted.get(`${language.code}:${version.id}:${planned.id}`)!;
      const here = href(planned.slug);

      const model: PageModel = {
        language,
        languages: site.languages.published,
        version,
        versions: versionConfig.versions,
        latestVersion: versionConfig.latest,
        strings,
        pageId: planned.id,
        title: built.document.title,
        abstract: built.document.abstract,
        bodyHtml: built.html,
        headings: built.document.headings,
        url: here,
        canonical: site.product.baseUrl ? `${site.product.baseUrl.replace(/\/$/, '')}${here}` : undefined,
        alternates: site.languages.published.map((other) => ({
          language: other,
          href: known.get(`${other.code}:${version.id}`)?.has(planned.id)
            ? url.page(other.code, version.id, planned.slug)
            : undefined,
        })),
        versionLinks: versionConfig.versions.map((other) => ({
          version: other,
          href: known.get(`${language.code}:${other.id}`)?.has(planned.id)
            ? url.page(language.code, other.id, planned.slug)
            : undefined,
        })),
        nav: buildNav(nav, {
          currentId: planned.id,
          titles,
          strings,
          href,
          ancestry: planned.ancestry,
        }),
        crumbs: crumbsFor(planned, nav, { titles, strings, href, home }),
        previous: index > 0 ? pageLink(pages[index - 1]!) : undefined,
        next: index + 1 < pages.length ? pageLink(pages[index + 1]!) : undefined,
        // Relative to the documentation root, not the Keydra checkout: the docs are their
        // own repository, and `usermanual/content/...` is a path that does not exist in it.
        editUrl: `${site.product.docsRepository}/edit/${site.product.branch}/${relative(docsRoot, planned.file)}`,
        sourceUrl: `${site.product.docsRepository}/blob/${site.product.branch}/${relative(docsRoot, planned.file)}`,
        assets: { ...assets, favicon },
        searchIndexUrl: url.searchIndex(language.code, version.id),
        homeUrl: home,
        repositoryUrl: site.product.repository,
        license: site.product.license,
        layout: planned.layout,
        sections:
          planned.layout === 'landing'
            ? nav
                .filter((node) => node.id !== 'home')
                .map((node) => {
                  const firstChild = (node.children ?? []).find((child) =>
                    known.get(`${language.code}:${version.id}`)?.has(child.id),
                  );
                  const childPage = firstChild
                    ? converted.get(`${language.code}:${version.id}:${firstChild.id}`)
                    : undefined;
                  return {
                    id: node.id,
                    label: strings[`nav.group.${node.id}`] ?? node.id,
                    href: firstChild
                      ? href([node.slug, firstChild.slug].filter(Boolean).join('/'))
                      : href(node.slug),
                    abstract: childPage?.document.abstract ?? '',
                    pages: (node.children ?? []).filter((child) =>
                      known.get(`${language.code}:${version.id}`)?.has(child.id),
                    ).length,
                  };
                })
                .filter((section) => section.pages > 0)
            : undefined,
      };

      write(pathFor(here), render(model));

      // The index carries what a reader searches, in the words the page uses.
      searchDocuments.push({
        id: planned.id,
        pageId: planned.id,
        title: built.document.title,
        section: model.crumbs.slice(1, -1).map((crumb) => crumb.label).join(' / ') || strings['nav.home']!,
        abstract: built.document.abstract,
        headings: built.document.headings.map((heading) => heading.text).join(' · '),
        body: textOf(built.html),
        keywords: built.document.keywords.join(' '),
        url: here,
      });

      if (site.product.baseUrl) {
        sitemapEntries.push({
          loc: `${site.product.baseUrl.replace(/\/$/, '')}${here}`,
          alternates: model.alternates
            .filter((alternate) => alternate.href)
            .map((alternate) => ({
              lang: alternate.language.htmlLang,
              href: `${site.product.baseUrl.replace(/\/$/, '')}${alternate.href}`,
            })),
        });
      }
    });

    // The index is per language and per version, which is what keeps a Turkish search
    // from answering with an English page or a 0.1 search with a 0.2 one.
    write(
      fileFor(url.searchIndex(language.code, version.id)),
      JSON.stringify({ language: language.code, version: version.id, pages: searchDocuments }),
    );

    // A 404 per language and version, so a wrong address inside the Turkish tree answers
    // in Turkish.
    write(
      join(fileFor(home), '404.html'),
      render(notFoundModel(language, version, strings, home, assets, favicon)),
    );

    function pageLink(target: PlannedPage) {
      return {
        label: converted.get(`${language.code}:${version.id}:${target.id}`)!.document.title,
        href: href(target.slug),
      };
    }
  }
}

// --------------------------------------------------------------------------------------
// Aliases, redirects, the root, robots and the sitemap
// --------------------------------------------------------------------------------------

const redirect = (to: string, language: string) =>
  `<!doctype html><html lang="${language}"><head><meta charset="utf-8">` +
  `<meta http-equiv="refresh" content="0; url=${to}"><link rel="canonical" href="${to}">` +
  `<meta name="robots" content="noindex"><title>${to}</title></head>` +
  `<body><p><a href="${to}">${to}</a></p></body></html>`;

// `latest` is a tree of redirects rather than a copy: two copies of a page are two pages
// a search engine has to choose between, and the canonical link already names one.
const latest = versionConfig.versions.find((version) => version.id === versionConfig.latest);
if (latest && buildVersions.some((version) => version.id === latest.id)) {
  for (const language of languages) {
    for (const planned of plan(nav, language.code)) {
      if (!known.get(`${language.code}:${latest.id}`)?.has(planned.id)) continue;
      const target = url.page(language.code, latest.id, planned.slug);
      write(pathFor(url.page(language.code, 'latest', planned.slug)), redirect(target, language.code));
    }
  }
}

// The site root goes to the default language's latest.
const defaultLanguage = site.languages.published.find(
  (language) => language.code === site.languages.default,
)!;
write('index.html', redirect(url.page(defaultLanguage.code, 'latest', ''), defaultLanguage.code));

// GitHub Pages serves /404.html for every address it cannot find, with a 404 status. A
// redirect there would turn "this page does not exist" into "here is the home page",
// which is how a broken link becomes invisible. So the site-wide 404 is the real page,
// in the default language.
{
  const fallbackVersion =
    buildVersions.find((version) => version.id === versionConfig.latest) ?? buildVersions[0];
  if (fallbackVersion) {
    write(
      '404.html',
      render(
        notFoundModel(
          defaultLanguage,
          fallbackVersion,
          loadStrings(defaultLanguage.code),
          url.page(defaultLanguage.code, 'latest', ''),
          assets,
          favicon,
        ),
      ),
    );
  }
}

// GitHub Pages runs Jekyll unless told not to, and Jekyll refuses to serve a path whose
// name begins with an underscore. Nothing here starts with one today; the file costs a
// byte and removes a class of failure that is invisible until it happens.
write('.nojekyll', '');

// A custom domain, when one is configured. Pages reads this file on every deploy, so
// leaving it out of the output is what un-sets the domain.
if (site.product.pages?.customDomain) {
  write('CNAME', `${site.product.pages.customDomain}\n`);
}

// Declared redirects, for pages that have moved.
const redirectsFile = join(docsRoot, 'navigation/redirects.yml');
if (existsSync(redirectsFile)) {
  const declared = (await import('js-yaml')).load(readFileSync(redirectsFile, 'utf8')) as {
    redirects?: { from: string; to: string }[];
  };
  for (const entry of declared.redirects ?? []) {
    write(pathFor(entry.from), redirect(entry.to, site.languages.default));
  }
}

write(
  'robots.txt',
  site.product.baseUrl
    ? `User-agent: *\nAllow: /\nSitemap: ${site.product.baseUrl.replace(/\/$/, '')}${url.base}sitemap.xml\n`
    : 'User-agent: *\nAllow: /\n',
);

if (sitemapEntries.length > 0) {
  write(
    'sitemap.xml',
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
      ...sitemapEntries.map((entry) =>
        [
          '  <url>',
          `    <loc>${entry.loc}</loc>`,
          ...entry.alternates.map(
            (alternate) =>
              `    <xhtml:link rel="alternate" hreflang="${alternate.lang}" href="${alternate.href}"/>`,
          ),
          '  </url>',
        ].join('\n'),
      ),
      '</urlset>',
    ].join('\n'),
  );
} else {
  note('no base URL configured, so no sitemap — set product.baseUrl in site.yml');
}

// --------------------------------------------------------------------------------------

if (brokenXrefs.length > 0) {
  note(`${brokenXrefs.length} unresolved cross-references — run \`make docs-check\` for the list`);
}

const pageCount = converted.size;
note(`wrote ${pageCount} pages to ${relative(repoRoot, distRoot)}/`);

// --------------------------------------------------------------------------------------
// Helpers used above
// --------------------------------------------------------------------------------------

function render(model: PageModel): string {
  return `<!doctype html>\n${renderToStaticMarkup(createElement(Document, { page: model }))}\n`;
}

function notFoundModel(
  language: Language,
  version: VersionEntry,
  strings: Record<string, string>,
  home: string,
  builtAssets: { css: string[]; js: string[] },
  faviconHref: string,
): PageModel {
  return {
    language,
    languages: site.languages.published,
    version,
    versions: versionConfig.versions,
    latestVersion: versionConfig.latest,
    strings,
    pageId: 'not-found',
    title: strings['notFound.title'] ?? 'Not found',
    abstract: '',
    headings: [],
    url: home,
    alternates: site.languages.published.map((other) => ({
      language: other,
      href: url.page(other.code, version.id, ''),
    })),
    versionLinks: versionConfig.versions.map((other) => ({
      version: other,
      href: url.page(language.code, other.id, ''),
    })),
    nav: [],
    crumbs: [],
    assets: { ...builtAssets, favicon: faviconHref },
    searchIndexUrl: url.searchIndex(language.code, version.id),
    homeUrl: home,
    repositoryUrl: site.product.repository,
    license: site.product.license,
    layout: 'notFound',
  };
}

/** Plain text of a rendered article, for the search index. */
function textOf(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
      // The "#" beside every heading is a link to that heading. Indexed, it becomes a
      // stray character in the middle of every excerpt.
      .replace(/<a class="kd-heading__anchor"[\s\S]*?<\/a>/g, ' ')
      // A code block's language chip and its copy button are interface, not content.
      .replace(/<div class="kd-code__bar">[\s\S]*?<\/div>\s*<\/div>/g, ' ')
      .replace(/<span class="kd-code__lang">[\s\S]*?<\/span>/g, ' ')
      .replace(/<button[\s\S]*?<\/button>/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

// Referenced so the folding used by the browser is the folding this build assumes.
void fold;
void tokenise;
