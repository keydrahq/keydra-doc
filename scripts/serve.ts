/**
 * Serve `dist/` locally.
 *
 *   tsx scripts/serve.ts [--port 9100] [--watch]
 *
 * <p>Static files and nothing else: whatever this serves is what a web server would serve,
 * so a page that works here works when it is deployed. The only cleverness is the one a
 * static host also performs — a directory answers with its `index.html`, and an address
 * that matches nothing answers with the 404 of the language tree it was inside.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync, watch } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { distRoot, docsRoot, contentRoot } from './lib/paths.ts';
import { site as loadSite, urls, versions as loadVersions } from './lib/config.ts';

const argv = process.argv.slice(2);
const flagOf = (name: string, fallback: string) => {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 ? (argv[at + 1] ?? fallback) : fallback;
};

const port = Number(flagOf('port', '9100'));
const site = loadSite();
// So a Pages-shaped build can be previewed exactly as it will be served. The values have
// to match whatever `yarn build` was given, or the server strips the wrong prefix.
if (argv.includes('--base-path')) site.product.basePath = flagOf('base-path', '/');
if (argv.includes('--docs-prefix')) site.output.docsPrefix = flagOf('docs-prefix', '');
const versionConfig = loadVersions();
const url = urls(site);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
};

const notFoundFor = (pathname: string): string | undefined => {
  // /docs/tr/0.1/anything -> the Turkish 404 for that version.
  const parts = pathname.split('/').filter(Boolean);
  const at = parts.indexOf(site.output.docsPrefix);
  if (at >= 0 && parts.length > at + 2) {
    const candidate = join(distRoot, parts[at]!, parts[at + 1]!, parts[at + 2]!, '404.html');
    if (existsSync(candidate)) return candidate;
  }
  const root = join(distRoot, '404.html');
  return existsSync(root) ? root : undefined;
};

const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  const withoutBase = pathname.startsWith(url.base) ? pathname.slice(url.base.length - 1) : pathname;
  let file = join(distRoot, normalize(withoutBase).replace(/^(\.\.[/\\])+/, ''));

  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');

  if (!existsSync(file)) {
    const fallback = notFoundFor(pathname);
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(fallback ? readFileSync(fallback) : 'Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    // Nothing is cached locally: a preview that serves yesterday's page is worse than a
    // slow one. Production caching is the container's job, and its config sets it.
    'Cache-Control': 'no-store',
  });
  response.end(readFileSync(file));
});

server.listen(port, () => {
  const latest = versionConfig.latest;
  console.log('');
  console.log(`  Keydra documentation — http://localhost:${port}${url.base}`);
  console.log('');
  for (const language of site.languages.published) {
    console.log(
      `  ${language.name.padEnd(9)} http://localhost:${port}${url.page(language.code, latest, '')}`,
    );
  }
  console.log('');
});

if (argv.includes('--watch')) {
  console.log('  watching content/, navigation/, locales/ and renderer/ — rebuild with `make docs`');
  for (const directory of [contentRoot, join(docsRoot, 'navigation'), join(docsRoot, 'locales')]) {
    if (existsSync(directory)) {
      watch(directory, { recursive: true }, (_event, name) => console.log(`  changed: ${name}`));
    }
  }
}
