/**
 * Everything the documentation does at runtime.
 *
 * <p>Plain TypeScript against the DOM rather than a framework: the pages are complete
 * before this file runs, so its whole job is to add the four behaviours a static document
 * cannot have — a sidebar that opens on a phone, menus, a table of contents that follows
 * the reader, a copy button, and search. Loading a component library to do that would
 * ship a megabyte to move a class name.
 */
import { openSearch, wireSearch } from './search.ts';

const on = <K extends keyof DocumentEventMap>(
  type: K,
  handler: (event: DocumentEventMap[K]) => void,
): void => document.addEventListener(type, handler);

const closestWith = (target: EventTarget | null, attribute: string): HTMLElement | null =>
  target instanceof Element ? target.closest<HTMLElement>(`[${attribute}]`) : null;

// --------------------------------------------------------------------------------------
// The sidebar, on a narrow screen
// --------------------------------------------------------------------------------------

const wireSidebar = (): void => {
  const toggle = document.querySelector<HTMLButtonElement>('[data-kd-sidebar-toggle]');
  const sidebar = document.querySelector<HTMLElement>('[data-kd-sidebar]');
  if (!toggle || !sidebar) return;

  const setOpen = (open: boolean) => {
    document.body.classList.toggle('kd-sidebar-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', () =>
    setOpen(toggle.getAttribute('aria-expanded') !== 'true'),
  );
  // Following a link on a phone should close what is covering the page.
  sidebar.addEventListener('click', (event) => {
    if ((event.target as Element).closest('a')) setOpen(false);
  });
  on('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('kd-sidebar-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
};

// --------------------------------------------------------------------------------------
// Expandable navigation groups
// --------------------------------------------------------------------------------------

const wireNavGroups = (): void => {
  on('click', (event) => {
    const toggle = closestWith(event.target, 'data-kd-nav-toggle');
    if (!toggle) return;
    const item = toggle.closest('.pf-v6-c-nav__item');
    const subnav = item?.querySelector<HTMLElement>('.pf-v6-c-nav__subnav');
    if (!item || !subnav) return;
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    item.classList.toggle('pf-m-expanded', !expanded);
    subnav.hidden = expanded;
  });
};

// --------------------------------------------------------------------------------------
// Masthead menus
// --------------------------------------------------------------------------------------

const closeMenus = (except?: Element): void => {
  document.querySelectorAll<HTMLElement>('[data-kd-menu]').forEach((menu) => {
    if (menu === except) return;
    menu.querySelector('[data-kd-menu-toggle]')?.setAttribute('aria-expanded', 'false');
    const list = menu.querySelector<HTMLElement>('[data-kd-menu-list]');
    if (list) list.hidden = true;
  });
};

/**
 * Carry the section the reader is on across a language or version switch.
 *
 * <p>A module's anchor is language-neutral by construction — `[id="…_{context}"]` is the
 * same string in every translation — so somebody reading about adding a connection in
 * English arrives at the same section in Turkish. A heading inside a module takes its id
 * from its own title and therefore differs; the browser lands at the top of the page,
 * which is the right failure. Written at the moment the menu opens rather than at build
 * time, because the build does not know where the reader has scrolled to.
 */
const carryTheAnchor = (menu: HTMLElement): void => {
  if (menu.dataset.kdMenu !== 'kd-language' && menu.dataset.kdMenu !== 'kd-version') return;
  const hash = window.location.hash;
  menu.querySelectorAll<HTMLAnchorElement>('[data-kd-menu-list] a').forEach((link) => {
    const base = link.dataset.kdHref ?? link.getAttribute('href') ?? '';
    link.dataset.kdHref = base;
    link.setAttribute('href', `${base.split('#')[0]}${hash}`);
  });
};

const wireMenus = (): void => {
  on('click', (event) => {
    const toggle = closestWith(event.target, 'data-kd-menu-toggle');
    if (!toggle) {
      if (!closestWith(event.target, 'data-kd-menu')) closeMenus();
      return;
    }
    const menu = toggle.closest<HTMLElement>('[data-kd-menu]');
    const list = menu?.querySelector<HTMLElement>('[data-kd-menu-list]');
    if (!menu || !list) return;
    const open = toggle.getAttribute('aria-expanded') === 'true';
    closeMenus(menu);
    toggle.setAttribute('aria-expanded', String(!open));
    list.hidden = open;
    if (!open) {
      carryTheAnchor(menu);
      list.querySelector<HTMLElement>('a,button')?.focus();
    }
  });

  on('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const open = document.querySelector<HTMLElement>('[data-kd-menu-toggle][aria-expanded="true"]');
    if (!open) return;
    closeMenus();
    open.focus();
  });
};

// --------------------------------------------------------------------------------------
// Theme
// --------------------------------------------------------------------------------------

const applyTheme = (choice: string): void => {
  const root = document.documentElement;
  root.classList.remove('pf-v6-theme-dark');
  if (choice === 'dark') root.classList.add('pf-v6-theme-dark');
  if (choice === 'system') {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('pf-v6-theme-dark');
    }
    delete root.dataset.kdTheme;
  } else {
    root.dataset.kdTheme = choice;
  }
  try {
    if (choice === 'system') localStorage.removeItem('kd-theme');
    else localStorage.setItem('kd-theme', choice);
  } catch {
    // A browser that blocks site data still gets the theme for this page.
  }
};

const wireTheme = (): void => {
  const stored = (() => {
    try {
      return localStorage.getItem('kd-theme');
    } catch {
      return null;
    }
  })();
  applyTheme(stored ?? 'system');

  on('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    if (!link || !link.closest('[data-kd-menu="kd-theme"]')) return;
    const choice = link.getAttribute('href')?.replace('#', '');
    if (!choice) return;
    event.preventDefault();
    applyTheme(choice);
    closeMenus();
  });

  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (!document.documentElement.dataset.kdTheme) applyTheme('system');
    });
};

// --------------------------------------------------------------------------------------
// Copy a code block
// --------------------------------------------------------------------------------------

const wireCopy = (): void => {
  on('click', async (event) => {
    const button = closestWith(event.target, 'data-kd-copy');
    if (!button) return;
    const block = button.closest('[data-kd-code]')?.querySelector('pre');
    const text = block?.textContent ?? '';
    const label = button.querySelector('.pf-v6-c-button__text');
    if (!label) return;
    const original = label.textContent ?? '';
    try {
      await navigator.clipboard.writeText(text);
      label.textContent = button.dataset.copied ?? original;
    } catch {
      label.textContent = original;
    }
    window.setTimeout(() => {
      label.textContent = original;
    }, 2000);
  });
};

// --------------------------------------------------------------------------------------
// The table of contents follows the reader
// --------------------------------------------------------------------------------------

const wireToc = (): void => {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-kd-toc-link]')];
  if (links.length === 0) return;
  const sections = links
    .map((link) => document.getElementById(link.dataset.kdTocLink ?? ''))
    .filter((element): element is HTMLElement => element !== null);
  if (sections.length === 0) return;

  const mark = (id: string) => {
    for (const link of links) {
      const current = link.dataset.kdTocLink === id;
      link.classList.toggle('kd-toc__link--current', current);
      if (current) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  };

  // The top band of the viewport decides: a heading is "current" from the moment it
  // reaches the top, which is what a reader scrolling downwards expects.
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) mark(visible.target.id);
    },
    { rootMargin: '-72px 0px -70% 0px', threshold: 0 },
  );
  sections.forEach((section) => observer.observe(section));
  mark(sections[0]!.id);
};

// --------------------------------------------------------------------------------------

const start = (): void => {
  wireSidebar();
  wireNavGroups();
  wireMenus();
  wireTheme();
  wireCopy();
  wireToc();
  wireSearch();

  on('keydown', (event) => {
    const typing =
      event.target instanceof HTMLElement &&
      /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName);
    if (typing) return;
    if (event.key === '/' && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      openSearch();
    }
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
