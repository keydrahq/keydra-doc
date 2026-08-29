import type { JSX } from 'react';
import type { NavItem, PageModel } from '../types/index.ts';

const Items = ({ items, depth }: { items: NavItem[]; depth: number }): JSX.Element => (
  <ul className="pf-v6-c-nav__list" role="list">
    {items.map((item) =>
      item.children.length > 0 ? (
        <li
          className={`pf-v6-c-nav__item pf-m-expandable${item.open ? ' pf-m-expanded' : ''}`}
          key={item.id}
        >
          {/*
            A button rather than a link when the group has no page of its own: a heading
            that navigates nowhere is a link that lies about what it does. When it does
            have a page, the group's own entry appears as the first child instead, so the
            expander is only ever an expander.
          */}
          <button
            type="button"
            className="pf-v6-c-nav__link"
            aria-expanded={item.open ? 'true' : 'false'}
            data-kd-nav-toggle
          >
            {item.label}
            <span className="pf-v6-c-nav__toggle">
              <span className="pf-v6-c-nav__toggle-icon">
                <svg viewBox="0 0 256 512" width="1em" height="1em" fill="currentColor" aria-hidden="true">
                  <path d="M224.3 273l-136 136c-9.4 9.4-24.6 9.4-33.9 0l-22.6-22.6c-9.4-9.4-9.4-24.6 0-33.9l96.4-96.4-96.4-96.4c-9.4-9.4-9.4-24.6 0-33.9L54.3 103c9.4-9.4 24.6-9.4 33.9 0l136 136c9.5 9.4 9.5 24.6.1 34z" />
                </svg>
              </span>
            </span>
          </button>
          <section className="pf-v6-c-nav__subnav" {...(item.open ? {} : { hidden: true })}>
            <Items items={item.children} depth={depth + 1} />
          </section>
        </li>
      ) : (
        <li className="pf-v6-c-nav__item" key={item.id}>
          <a
            className={`pf-v6-c-nav__link${item.current ? ' pf-m-current' : ''}`}
            href={item.href}
            {...(item.current ? { 'aria-current': 'page' as const } : {})}
          >
            {item.label}
          </a>
        </li>
      ),
    )}
  </ul>
);

export const Sidebar = ({ page }: { page: PageModel }): JSX.Element => (
  <div className="pf-v6-c-page__sidebar kd-sidebar" id="kd-sidebar" data-kd-sidebar>
    <div className="pf-v6-c-page__sidebar-body">
      <nav className="pf-v6-c-nav kd-nav" aria-label={page.strings['nav.label']}>
        <Items items={page.nav} depth={0} />
      </nav>
    </div>
  </div>
);
