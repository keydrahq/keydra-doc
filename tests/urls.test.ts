import { describe, expect, it } from 'vitest';
import { urls, type SiteConfig } from '../scripts/lib/config.ts';

const config = (basePath: string): SiteConfig =>
  ({
    product: { basePath },
    output: { docsPrefix: 'docs' },
  }) as SiteConfig;

describe('URL building', () => {
  it('puts the language and the version in the path', () => {
    const url = urls(config('/'));
    expect(url.page('en', '0.1', 'getting-started')).toBe('/docs/en/0.1/getting-started/');
    expect(url.page('tr', '0.1', 'getting-started')).toBe('/docs/tr/0.1/getting-started/');
  });

  it('keeps a nested slug', () => {
    const url = urls(config('/'));
    expect(url.page('en', '0.1', 'security/access-control')).toBe(
      '/docs/en/0.1/security/access-control/',
    );
  });

  it('answers the language root with no slug', () => {
    expect(urls(config('/')).page('en', 'latest', '')).toBe('/docs/en/latest/');
  });

  it('works under a subpath, which is what a project page needs', () => {
    const url = urls(config('/keydra/'));
    expect(url.page('en', '0.1', 'reference/api')).toBe('/keydra/docs/en/0.1/reference/api/');
    expect(url.asset('docs.abc.css')).toBe('/keydra/assets/docs.abc.css');
    expect(url.searchIndex('tr', '0.1')).toBe('/keydra/docs/tr/0.1/search-index.json');
  });

  it('tolerates a base path written without a trailing slash', () => {
    expect(urls(config('/keydra')).page('en', '0.1', '')).toBe('/keydra/docs/en/0.1/');
  });
});
