import type { Heading } from '../../../scripts/lib/asciidoc.ts';
import type { Language, Strings, VersionEntry } from '../../../scripts/lib/config.ts';

export type { Heading, Language, Strings, VersionEntry };

/** One entry in the rendered navigation tree, already resolved to a URL and a label. */
export interface NavItem {
  id: string;
  label: string;
  href?: string;
  children: NavItem[];
  /** True for the page being rendered. */
  current: boolean;
  /** True when a descendant is the page being rendered. */
  open: boolean;
}

export interface Crumb {
  label: string;
  href?: string;
}

export interface PageLink {
  label: string;
  href: string;
}

/** Everything the shell needs to draw one page. There is no other input. */
export interface PageModel {
  language: Language;
  languages: Language[];
  version: VersionEntry;
  versions: VersionEntry[];
  latestVersion: string;
  strings: Strings;

  /** Stable, language-neutral page id — what the language switcher maps on. */
  pageId: string;
  title: string;
  abstract: string;
  /** The converted article, or undefined for a page the shell draws itself (404). */
  bodyHtml?: string;
  headings: Heading[];

  url: string;
  canonical?: string;
  /** Same page in each other published language, when it exists there. */
  alternates: { language: Language; href: string | undefined }[];
  /** Same page in each version, when it exists there. */
  versionLinks: { version: VersionEntry; href: string | undefined }[];

  nav: NavItem[];
  crumbs: Crumb[];
  previous?: PageLink;
  next?: PageLink;

  /** Repository URL of the AsciiDoc file this page was built from. */
  editUrl?: string;
  sourceUrl?: string;

  assets: { css: string[]; js: string[]; favicon: string };
  searchIndexUrl: string;
  homeUrl: string;
  repositoryUrl: string;
  license: string;

  /** `landing` draws the card grid, `article` the document, `notFound` the 404. */
  layout: 'landing' | 'article' | 'notFound';
  /** Cards for the landing page. */
  sections?: { id: string; label: string; href: string; abstract: string; pages: number }[];
}
