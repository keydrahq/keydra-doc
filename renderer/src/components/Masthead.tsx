import type { JSX } from 'react';
import type { PageModel } from '../types/index.ts';
import { Wordmark } from './Brand.tsx';
import { BarsIcon, CaretIcon, GithubIcon, GlobeIcon, SearchIcon } from './Icons.tsx';

/**
 * A PatternFly menu, rendered closed.
 *
 * <p>Static HTML with the attributes an open menu would carry, hidden until the
 * enhancement script shows it. There is no React at runtime, so the toggle is a button
 * and a `hidden` attribute rather than state — which also means the menu's contents are
 * in the page for a reader whose JavaScript never arrives, reachable through the link
 * each item already is.
 */
const Menu = ({
  id,
  label,
  current,
  items,
  icon,
}: {
  id: string;
  label: string;
  current: string;
  items: { label: string; href: string | undefined; selected: boolean; note?: string }[];
  icon?: JSX.Element;
}): JSX.Element => (
  <div className="pf-v6-c-menu-toggle-group kd-menu" data-kd-menu={id}>
    <button
      type="button"
      className="pf-v6-c-menu-toggle pf-m-plain kd-menu__toggle"
      id={`${id}-toggle`}
      aria-expanded="false"
      aria-haspopup="true"
      aria-controls={`${id}-menu`}
      aria-label={label}
      data-kd-menu-toggle
    >
      {icon ? <span className="pf-v6-c-menu-toggle__icon">{icon}</span> : null}
      <span className="pf-v6-c-menu-toggle__text">{current}</span>
      <span className="pf-v6-c-menu-toggle__controls">
        <span className="pf-v6-c-menu-toggle__toggle-icon">
          <CaretIcon />
        </span>
      </span>
    </button>
    <div className="pf-v6-c-menu kd-menu__list" id={`${id}-menu`} hidden data-kd-menu-list>
      <div className="pf-v6-c-menu__content">
        <ul className="pf-v6-c-menu__list" role="menu" aria-label={label}>
          {items.map((item) => (
            <li className="pf-v6-c-menu__list-item" role="none" key={item.label}>
              {item.href ? (
                <a
                  className="pf-v6-c-menu__item"
                  href={item.href}
                  role="menuitem"
                  {...(item.selected ? { 'aria-current': 'true' as const } : {})}
                >
                  <span className="pf-v6-c-menu__item-main">
                    <span className="pf-v6-c-menu__item-text">{item.label}</span>
                  </span>
                  {item.note ? (
                    <span className="pf-v6-c-menu__item-description">{item.note}</span>
                  ) : null}
                </a>
              ) : (
                <span className="pf-v6-c-menu__item pf-m-disabled" role="menuitem" aria-disabled="true">
                  <span className="pf-v6-c-menu__item-main">
                    <span className="pf-v6-c-menu__item-text">{item.label}</span>
                  </span>
                  {item.note ? (
                    <span className="pf-v6-c-menu__item-description">{item.note}</span>
                  ) : null}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

export const Masthead = ({ page }: { page: PageModel }): JSX.Element => {
  const t = (key: string, fallback = '') => page.strings[key] ?? fallback;

  return (
    <header className="pf-v6-c-masthead kd-masthead" id="kd-masthead">
      <div className="pf-v6-c-masthead__main">
        <span className="pf-v6-c-masthead__toggle">
          <button
            type="button"
            className="pf-v6-c-button pf-m-plain"
            aria-label={t('nav.toggle')}
            aria-expanded="false"
            aria-controls="kd-sidebar"
            data-kd-sidebar-toggle
          >
            <span className="pf-v6-c-button__icon">
              <BarsIcon />
            </span>
          </button>
        </span>
        <a className="pf-v6-c-masthead__brand kd-brand" href={page.homeUrl}>
          <Wordmark title={t('footer.product', 'Keydra')} />
          <span className="kd-brand__docs">{t('site.short')}</span>
        </a>
      </div>

      <div className="pf-v6-c-masthead__content">
        <div className="pf-v6-c-toolbar kd-masthead__toolbar">
          <div className="pf-v6-c-toolbar__content">
            <div className="pf-v6-c-toolbar__content-section">
              <div className="pf-v6-c-toolbar__item kd-masthead__search">
                <button
                  type="button"
                  className="pf-v6-c-button pf-m-secondary kd-searchbutton"
                  data-kd-search-open
                  aria-label={t('search.open')}
                >
                  <span className="pf-v6-c-button__icon pf-m-start">
                    <SearchIcon />
                  </span>
                  <span className="pf-v6-c-button__text">{t('search.placeholder')}</span>
                  <kbd className="kd-kbd" aria-hidden="true">
                    /
                  </kbd>
                </button>
              </div>

              <div className="pf-v6-c-toolbar__item">
                <Menu
                  id="kd-language"
                  label={t('language.change')}
                  current={page.language.endonym}
                  icon={<GlobeIcon />}
                  items={page.alternates.map((alternate) => ({
                    label: alternate.language.endonym,
                    href: alternate.href,
                    selected: alternate.language.code === page.language.code,
                    note: alternate.href ? undefined : t('language.unavailable'),
                  }))}
                />
              </div>

              <div className="pf-v6-c-toolbar__item">
                <Menu
                  id="kd-version"
                  label={t('version.change')}
                  current={page.version.label}
                  items={page.versionLinks.map((entry) => ({
                    label: entry.version.label,
                    href: entry.href,
                    selected: entry.version.id === page.version.id,
                    note:
                      entry.version.state === 'development'
                        ? t('version.development')
                        : entry.href
                          ? undefined
                          : t('version.unavailable'),
                  }))}
                />
              </div>

              <div className="pf-v6-c-toolbar__item">
                <Menu
                  id="kd-theme"
                  label={t('theme.label')}
                  current={t('theme.label')}
                  items={[
                    { label: t('theme.system'), href: '#system', selected: false },
                    { label: t('theme.light'), href: '#light', selected: false },
                    { label: t('theme.dark'), href: '#dark', selected: false },
                  ]}
                />
              </div>

              <div className="pf-v6-c-toolbar__item">
                <a
                  className="pf-v6-c-button pf-m-plain"
                  href={page.repositoryUrl}
                  aria-label={t('footer.repository')}
                  rel="noopener noreferrer"
                >
                  <span className="pf-v6-c-button__icon">
                    <GithubIcon />
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
