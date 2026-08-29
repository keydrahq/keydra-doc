/**
 * The search overlay's behaviour.
 *
 * <p>One index per language and version, fetched the first time somebody opens the
 * overlay rather than on every page load: a reader who never searches never downloads it.
 * MiniSearch does the matching; the interface is PatternFly markup this file fills in,
 * because a library's own widget would be a second design system on the page.
 */
import MiniSearch from 'minisearch';
import { fold, tokenise } from '../search/normalise.ts';

interface IndexedPage {
  id: string;
  pageId: string;
  title: string;
  section: string;
  abstract: string;
  headings: string;
  body: string;
  keywords: string;
  url: string;
}

let engine: MiniSearch<IndexedPage> | null = null;
let documents = new Map<string, IndexedPage>();
let loading: Promise<void> | null = null;

const element = () => document.querySelector<HTMLElement>('[data-kd-search]');
const input = () => document.querySelector<HTMLInputElement>('[data-kd-search-input]');
const results = () => document.querySelector<HTMLElement>('[data-kd-search-results]');
const status = () => document.querySelector<HTMLElement>('[data-kd-search-status]');

const strings = (): Record<string, string> => {
  const raw = document.querySelector<HTMLScriptElement>('#kd-strings')?.textContent;
  try {
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
};

const load = async (): Promise<void> => {
  const host = element();
  if (!host || engine) return;
  if (loading) return loading;
  loading = (async () => {
    const response = await fetch(host.dataset.index ?? '');
    const payload = (await response.json()) as { pages: IndexedPage[] };
    documents = new Map(payload.pages.map((page) => [page.id, page]));
    engine = new MiniSearch<IndexedPage>({
      idField: 'id',
      fields: ['title', 'headings', 'abstract', 'keywords', 'body', 'section'],
      storeFields: ['title', 'section', 'url', 'abstract'],
      processTerm: (term) => {
        const folded = fold(term);
        return folded.length > 1 ? folded : null;
      },
      tokenize: (text) => tokenise(text),
      searchOptions: {
        prefix: true,
        fuzzy: 0.15,
        boost: { title: 4, headings: 2, keywords: 2, abstract: 1.5 },
      },
    });
    engine.addAll(payload.pages);
  })();
  return loading;
};

/** A window of the body around the first match, so a result says why it matched. */
const excerpt = (page: IndexedPage, query: string): string => {
  const body = page.body ?? '';
  const needle = fold(query.split(/\s+/)[0] ?? '');
  const at = fold(body).indexOf(needle);
  if (at < 0) return page.abstract || body.slice(0, 160);
  const from = Math.max(0, at - 90);
  return `${from > 0 ? '…' : ''}${body.slice(from, from + 200).trim()}…`;
};

const render = (query: string): void => {
  const list = results();
  const note = status();
  if (!list || !note) return;
  const text = strings();

  if (!engine || query.trim().length < 2) {
    list.innerHTML = '';
    note.textContent = '';
    return;
  }

  const hits = engine.search(query).slice(0, 20);
  if (hits.length === 0) {
    list.innerHTML = '';
    note.textContent = text['search.noResults'] ?? '';
    return;
  }

  const count = (hits.length === 1 ? text['search.resultCount_one'] : text['search.resultCount_other']) ?? '';
  note.textContent = count.replace('{count}', String(hits.length));

  list.innerHTML = hits
    .map((hit) => {
      const page = documents.get(String(hit.id));
      if (!page) return '';
      const escape = (value: string) =>
        value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return [
        `<a class="kd-search__result" role="option" href="${escape(page.url)}">`,
        `<span class="kd-search__result-section">${escape(page.section)}</span>`,
        `<span class="kd-search__result-title">${escape(page.title)}</span>`,
        `<span class="kd-search__result-excerpt">${escape(excerpt(page, query))}</span>`,
        `</a>`,
      ].join('');
    })
    .join('');
};

let restoreFocusTo: HTMLElement | null = null;

export const openSearch = (): void => {
  const host = element();
  if (!host) return;
  restoreFocusTo = document.activeElement as HTMLElement | null;
  host.hidden = false;
  document.body.classList.add('kd-search-open');
  void load().then(() => render(input()?.value ?? ''));
  input()?.focus();
};

export const closeSearch = (): void => {
  const host = element();
  if (!host) return;
  host.hidden = true;
  document.body.classList.remove('kd-search-open');
  restoreFocusTo?.focus();
};

export const wireSearch = (): void => {
  if (!element()) return;

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[data-kd-search-open]')) {
      event.preventDefault();
      openSearch();
    } else if (target.closest('[data-kd-search-close]')) {
      event.preventDefault();
      closeSearch();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !element()?.hidden) {
      event.preventDefault();
      closeSearch();
      return;
    }
    if (element()?.hidden) return;
    // Down and up move through the results without leaving the input.
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Enter') return;
    const options = [...(results()?.querySelectorAll<HTMLAnchorElement>('.kd-search__result') ?? [])];
    if (options.length === 0) return;
    const active = options.findIndex((option) => option === document.activeElement);
    if (event.key === 'Enter' && active < 0) {
      event.preventDefault();
      options[0]!.click();
      return;
    }
    if (event.key === 'Enter') return;
    event.preventDefault();
    const next =
      event.key === 'ArrowDown'
        ? Math.min(active + 1, options.length - 1)
        : Math.max(active - 1, -1);
    if (next < 0) input()?.focus();
    else options[next]!.focus();
  });

  let timer = 0;
  input()?.addEventListener('input', (event) => {
    window.clearTimeout(timer);
    const value = (event.target as HTMLInputElement).value;
    timer = window.setTimeout(() => render(value), 120);
  });
};
