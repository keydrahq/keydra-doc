/**
 * One PDF per language per version.
 *
 *   tsx scripts/build-pdf.ts [--language en] [--version 0.1]
 *
 * <p>Asciidoctor PDF is a Ruby program and this toolchain has no Ruby, so the route is the
 * one the site already produces: every assembly converted with the same converter, joined
 * into a single document, and printed by a headless Chromium through the same stylesheet
 * the web pages use. The print rules in `docs.css` are what turn it into a document rather
 * than a screenshot — navigation, search and the interactive controls are display:none.
 *
 * <p>The by-product is worth having on its own: `dist/docs/<lang>/<version>/single-page/`
 * is the whole documentation as one page, for offline reading and for printing by hand.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import fg from 'fast-glob';
import { chromium } from 'playwright';
import {
  navigation,
  site as loadSite,
  strings as loadStrings,
  urls,
  versions as loadVersions,
} from './lib/config.ts';
import { plan } from './lib/pages.ts';
import { distRoot, docsRoot } from './lib/paths.ts';

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 ? argv[at + 1] : undefined;
};

const site = loadSite();
const versionConfig = loadVersions();
const nav = navigation();
const url = urls(site);

if (!existsSync(distRoot)) {
  console.error('  Nothing is built. Run `make docs` first.');
  process.exit(1);
}

const languages = site.languages.published.filter(
  (language) => !flag('language') || language.code === flag('language'),
);
const buildVersions = versionConfig.versions.filter(
  (version) => !flag('version') || version.id === flag('version'),
);

// The single page is opened over `file://`, where a site-absolute `/assets/...` resolves
// against the filesystem root and every stylesheet and typeface silently fails to load —
// which is a PDF set in the browser's default serif. Absolute file URLs instead.
const assets = fg
  .sync('assets/*.css', { cwd: distRoot })
  .map((file) => `<link rel="stylesheet" href="file://${join(distRoot, file)}">`)
  .join('\n');

/** A filename nothing has to escape: no spaces, no accents, no slashes. */
const sanitise = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z0-9.-]+/g, '-')
    .replace(/^-|-$/g, '');

const browser = await chromium.launch();

for (const version of buildVersions) {
  for (const language of languages) {
    const strings = loadStrings(language.code);
    const pages = plan(nav, language.code).filter((page) =>
      existsSync(join(distRoot, `${site.output.docsPrefix}/${language.code}/${version.id}`,
        ...page.slug.split('/').filter(Boolean), 'index.html')),
    );
    if (pages.length === 0) continue;

    // Each page's article, in reading order, with its anchors namespaced so two pages
    // that both define `#requirements` do not collide in one document.
    const articles = pages
      .map((page) => {
        const file = join(
          distRoot,
          site.output.docsPrefix,
          language.code,
          version.id,
          ...page.slug.split('/').filter(Boolean),
          'index.html',
        );
        const html = readFileSync(file, 'utf8');
        const article = /<article class="kd-article"[^>]*>([\s\S]*?)<\/article>/.exec(html)?.[1];
        const landing = /<div class="kd-prose kd-landing__intro">([\s\S]*?)<\/div>/.exec(html)?.[1];
        const title = /<h1 class="kd-(?:article|landing)__title">([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? '';
        const body = (article ?? landing ?? '')
          .replace(/<nav class="pf-v6-c-breadcrumb[\s\S]*?<\/nav>/g, '')
          .replace(/<div class="pf-v6-c-alert pf-m-info pf-m-inline kd-version-notice[\s\S]*?<\/div><\/div>/g, '')
          .replace(/<nav class="kd-pager"[\s\S]*?<\/nav>/g, '')
          .replace(/<p class="kd-article__edit">[\s\S]*?<\/p>/g, '')
          // The document supplies its own chapter heading below, so the page's own would
          // print the title twice.
          .replace(/<h1 class="kd-(?:article|landing)__title">[\s\S]*?<\/h1>/, '')
          // Screenshots are site-absolute, and this document is opened over `file://`,
          // where a leading slash is the filesystem root. Same fix the stylesheets get.
          .replace(/(<img[^>]*\bsrc=")(\/[^"]*)/g, (_, head: string, href: string) =>
            `${head}file://${join(distRoot, href.slice(url.base.length))}`)
          .replace(/ id="/g, ` id="${page.id}--`)
          .replace(/href="#/g, `href="#${page.id}--`);
        return { id: page.id, title, body };
      })
      .filter((entry) => entry.body.trim() !== '');

    const contents = articles
      .map((entry) => `<li><a href="#page-${entry.id}">${entry.title}</a></li>`)
      .join('\n');

    const title = `${site.product.name} ${version.label} — ${strings['site.title']}`;
    const document = [
      `<!doctype html>`,
      `<html lang="${language.htmlLang}" dir="${language.direction}">`,
      `<head><meta charset="utf-8"><title>${title}</title>${assets}`,
      `<style>
        /* Print layout, for this document only. The web pages keep their own. */
        body { background: #fff; }
        .kd-pdf-cover { break-after: page; padding-block: 6rem 2rem; }
        .kd-pdf-cover h1 { font-family: var(--pf-t--global--font--family--heading);
          font-size: 3rem; margin: 0 0 .5rem; }
        .kd-pdf-cover p { color: var(--pf-t--global--text--color--subtle); margin: .25rem 0; }
        .kd-pdf-toc { break-after: page; }
        .kd-pdf-toc > h1 { font-family: var(--pf-t--global--font--family--heading);
          font-size: 2rem; margin-block: 0 1rem; }
        .kd-pdf-toc ol { padding-inline-start: 1.5rem; }
        .kd-pdf-toc li { margin-block: .35rem; }
        .kd-pdf-page { break-before: page; }
        .kd-pdf-page > h1 { font-family: var(--pf-t--global--font--family--heading);
          font-size: 2rem; margin-block: 0 1rem;
          padding-block-end: .4rem; border-block-end: 2px solid currentColor; }
        .kd-article { max-inline-size: none; }
        a { color: inherit; text-decoration: none; }
        .kd-prose a { text-decoration: underline; }
       </style>`,
      `</head><body class="kd-body"><main class="kd-main__body">`,
      `<section class="kd-pdf-cover">`,
      `<h1>${site.product.name}</h1>`,
      `<p>${strings['site.title']}</p>`,
      `<p>${(strings['footer.docsVersion'] ?? '').replace('{version}', version.label)}</p>`,
      `<p>${language.endonym}</p>`,
      version.state === 'development'
        ? `<p><strong>${strings['version.development']}</strong></p>`
        : '',
      `</section>`,
      `<nav class="kd-pdf-toc"><h1>${strings['toc.title'] ?? 'Contents'}</h1><ol>${contents}</ol></nav>`,
      ...articles.map(
        (entry) =>
          `<article class="kd-article kd-pdf-page" id="page-${entry.id}">` +
          `<h1>${entry.title}</h1>${entry.body}</article>`,
      ),
      `</main></body></html>`,
    ].join('\n');

    // The single-page build is served beside the multi-page one, and is what the PDF is
    // printed from — so what a reader downloads and what they can read online are the
    // same document.
    const singleDir = join(
      distRoot,
      site.output.docsPrefix,
      language.code,
      version.id,
      'single-page',
    );
    mkdirSync(singleDir, { recursive: true });
    writeFileSync(join(singleDir, 'index.html'), document);

    const page = await browser.newPage();
    await page.goto(`file://${join(singleDir, 'index.html')}`, { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'print' });

    const outputDir = join(docsRoot, 'pdf');
    mkdirSync(outputDir, { recursive: true });
    const name = `${sanitise(site.product.name)}-${sanitise(version.id)}-Documentation-${language.code}.pdf`;
    await page.pdf({
      path: join(outputDir, name),
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', bottom: '20mm', left: '18mm', right: '18mm' },
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:8px;width:100%;padding:0 18mm;color:#666;">
        <span>${site.product.name} ${version.label}</span></div>`,
      footerTemplate: `<div style="font-size:8px;width:100%;padding:0 18mm;color:#666;
        display:flex;justify-content:space-between;">
        <span>${strings['site.title']}</span>
        <span class="pageNumber"></span>/<span class="totalPages"></span></div>`,
    });
    await page.close();

    console.log(`  ${relative(docsRoot, join(outputDir, name))}`);
  }
}

await browser.close();
