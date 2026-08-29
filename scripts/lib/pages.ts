/**
 * Turning the navigation and the content tree into a list of pages to render.
 *
 * <p>The navigation is the site's shape and this is where that shape becomes URLs,
 * breadcrumbs, previous/next and the language and version menus. Doing it in one place is
 * what makes those five agree with each other.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { NavItem, Crumb } from '../../renderer/src/types/index.ts';
import type { NavNode, SiteConfig, Strings, VersionEntry } from './config.ts';
import { contentRoot } from './paths.ts';

export interface PlannedPage {
  /** Stable, language-neutral. The language and version switchers map on this. */
  id: string;
  slug: string;
  page: string;
  layout: 'landing' | 'article';
  /** The chain of navigation ids from the root down to this page. */
  ancestry: string[];
  file: string;
  exists: boolean;
}

const flatten = (
  nodes: NavNode[],
  language: string,
  ancestry: string[] = [],
  parentSlug = '',
): PlannedPage[] =>
  nodes.flatMap((node) => {
    const slug = [parentSlug, node.slug].filter(Boolean).join('/');
    const here: PlannedPage[] = [];
    if (node.page) {
      const file = join(contentRoot, language, 'assemblies', `${node.page}.adoc`);
      here.push({
        id: node.id,
        slug,
        page: node.page,
        layout: node.layout ?? 'article',
        ancestry: [...ancestry, node.id],
        file,
        exists: existsSync(file),
      });
    }
    return [...here, ...flatten(node.children ?? [], language, [...ancestry, node.id], slug)];
  });

export const plan = (nav: NavNode[], language: string): PlannedPage[] => flatten(nav, language);

/** The reading order of the site: what previous and next mean. */
export const readingOrder = (pages: PlannedPage[]): PlannedPage[] => pages;

export interface Titles {
  /** page id -> title, for the language being rendered. */
  byId: Map<string, string>;
}

export const buildNav = (
  nodes: NavNode[],
  options: {
    currentId: string;
    titles: Titles;
    strings: Strings;
    href: (slug: string) => string;
    parentSlug?: string;
    ancestry: string[];
  },
): NavItem[] =>
  nodes.map((node) => {
    const slug = [options.parentSlug ?? '', node.slug].filter(Boolean).join('/');
    const children = buildNav(node.children ?? [], { ...options, parentSlug: slug });
    const current = node.page !== undefined && node.id === options.currentId;
    return {
      id: node.id,
      label:
        (node.page ? options.titles.byId.get(node.id) : undefined) ??
        options.strings[`nav.group.${node.id}`] ??
        node.id,
      href: node.page ? options.href(slug) : undefined,
      children,
      current,
      open:
        options.ancestry.includes(node.id) ||
        children.some((child) => child.current || child.open),
    };
  });

export const crumbsFor = (
  page: PlannedPage,
  nodes: NavNode[],
  options: { titles: Titles; strings: Strings; href: (slug: string) => string; home: string },
): Crumb[] => {
  const crumbs: Crumb[] = [{ label: options.strings['nav.home'] ?? '', href: options.home }];
  let level = nodes;
  let slug = '';
  for (const id of page.ancestry) {
    const node = level.find((candidate) => candidate.id === id);
    if (!node) break;
    slug = [slug, node.slug].filter(Boolean).join('/');
    if (node.id !== 'home') {
      crumbs.push({
        label:
          (node.page ? options.titles.byId.get(node.id) : undefined) ??
          options.strings[`nav.group.${node.id}`] ??
          node.id,
        href: node.page ? options.href(slug) : undefined,
      });
    }
    level = node.children ?? [];
  }
  return crumbs;
};

/** Which versions and languages a given page id exists in. */
export const availability = (
  site: SiteConfig,
  versions: VersionEntry[],
  known: Map<string, Set<string>>,
): ((pageId: string, language: string, version: string) => boolean) => {
  void site;
  void versions;
  return (pageId, language, version) => known.get(`${language}:${version}`)?.has(pageId) ?? false;
};
