import type { JSX } from 'react';
import type { PageModel } from '../types/index.ts';
import { AngleLeftIcon, AngleRightIcon, ExternalLinkIcon } from './Icons.tsx';

export const Pager = ({ page }: { page: PageModel }): JSX.Element | null => {
  if (!page.previous && !page.next) return null;
  return (
    <nav className="kd-pager" aria-label={page.strings['nav.label']}>
      {page.previous ? (
        <a className="kd-pager__link kd-pager__link--previous" href={page.previous.href} rel="prev">
          <span className="kd-pager__direction">
            <AngleLeftIcon /> {page.strings['pager.previous']}
          </span>
          <span className="kd-pager__title">{page.previous.label}</span>
        </a>
      ) : (
        <span />
      )}
      {page.next ? (
        <a className="kd-pager__link kd-pager__link--next" href={page.next.href} rel="next">
          <span className="kd-pager__direction">
            {page.strings['pager.next']} <AngleRightIcon />
          </span>
          <span className="kd-pager__title">{page.next.label}</span>
        </a>
      ) : (
        <span />
      )}
    </nav>
  );
};

export const Footer = ({ page }: { page: PageModel }): JSX.Element => (
  <footer className="kd-footer">
    <div className="kd-footer__inner">
      <p className="kd-footer__product">{page.strings['footer.product']}</p>
      <p className="kd-footer__meta">
        {(page.strings['footer.docsVersion'] ?? '').replace('{version}', page.version.label)}
        {page.license ? ` · ${page.license}` : ''}
      </p>
      <p className="kd-footer__links">
        <a href={page.repositoryUrl} rel="noopener noreferrer" className="kd-external">
          {page.strings['footer.repository']} <ExternalLinkIcon />
        </a>
      </p>
    </div>
  </footer>
);
