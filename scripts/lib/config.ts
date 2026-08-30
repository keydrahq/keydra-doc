import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';
import { docsRoot } from './paths.ts';

const yaml = <T>(name: string): T => load(readFileSync(join(docsRoot, name), 'utf8')) as T;

export interface Language {
  code: string;
  htmlLang: string;
  name: string;
  endonym: string;
  direction: 'ltr' | 'rtl';
}

export interface SiteConfig {
  product: {
    name: string;
    repository: string;
    docsRepository: string;
    branch: string;
    baseUrl: string;
    basePath: string;
    pages?: { customDomain?: string };
    images: {
      registry: string;
      standalone: string;
      backend: string;
      ui: string;
      tag: string;
    };
    chart: {
      name: string;
      repository: string;
      oci: string;
    };
    license: string;
  };
  languages: { default: string; published: Language[] };
  search: { maxResults: number; excerptRadius: number };
  output: { directory: string; docsPrefix: string };
}

export interface VersionEntry {
  id: string;
  label: string;
  state: 'stable' | 'development';
  ref: string;
  keydraVersion: string;
}

export interface VersionConfig {
  latest: string;
  stable: string;
  versions: VersionEntry[];
}

export interface NavNode {
  id: string;
  slug: string;
  /** The assembly this node renders, without the `.adoc`. Absent for a pure grouping node. */
  page?: string;
  /** `landing` uses the card layout; everything else is an article. */
  layout?: 'landing' | 'article';
  children?: NavNode[];
}

export const site = (): SiteConfig => yaml<SiteConfig>('site.yml');
export const versions = (): VersionConfig => yaml<VersionConfig>('versions.yml');
export const navigation = (): NavNode[] => yaml<{ nav: NavNode[] }>('navigation/nav.yml').nav;

export type Strings = Record<string, string>;

/** The documentation shell's own interface strings, for one language. */
export const strings = (language: string): Strings =>
  yaml<Strings>(join('locales', `${language}.yml`));

export const glossary = (language: string): { term: string; translation: string; keep?: boolean; note?: string }[] =>
  yaml<{ terms: { term: string; translation: string; keep?: boolean; note?: string }[] }>(
    join('glossary', `${language}.yml`),
  ).terms;

/**
 * Every URL on the site is built here.
 *
 * <p>One function, because a base path that is applied in some places and forgotten in
 * others is a site that works at the root and breaks under `/keydra/`.
 */
export const urls = (config: SiteConfig) => {
  const base = config.product.basePath.endsWith('/')
    ? config.product.basePath
    : `${config.product.basePath}/`;
  const prefix = config.output.docsPrefix;

  // The prefix is allowed to be empty: a site served from a repository already called
  // "docs" would otherwise answer at /docs/docs/en/… .
  const page = (language: string, version: string, slug: string): string => {
    const parts = [prefix, language, version, ...slug.split('/')].filter(Boolean);
    return `${base}${parts.join('/')}/`;
  };

  return {
    base,
    /** Where the site's assets live — one place, fingerprinted, shared by every page. */
    asset: (file: string): string => `${base}assets/${file}`,
    page,
    /** The search index for one language and version. */
    searchIndex: (language: string, version: string): string =>
      `${page(language, version, '')}search-index.json`,
    /** Language root, used by the 404 page and the language menu's fallback. */
    languageRoot: (language: string, version: string): string => page(language, version, ''),
  };
};
