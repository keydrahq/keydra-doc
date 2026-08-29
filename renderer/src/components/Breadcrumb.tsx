import type { JSX } from 'react';
import type { PageModel } from '../types/index.ts';
import { AngleRightIcon } from './Icons.tsx';

export const Breadcrumb = ({ page }: { page: PageModel }): JSX.Element | null => {
  if (page.crumbs.length === 0) return null;
  return (
    <nav className="pf-v6-c-breadcrumb kd-breadcrumb" aria-label={page.strings['nav.breadcrumb']}>
      <ol className="pf-v6-c-breadcrumb__list" role="list">
        {page.crumbs.map((crumb, index) => {
          const last = index === page.crumbs.length - 1;
          return (
            <li className="pf-v6-c-breadcrumb__item" key={`${crumb.label}-${index}`}>
              {index > 0 ? (
                <span className="pf-v6-c-breadcrumb__item-divider">
                  <AngleRightIcon />
                </span>
              ) : null}
              {crumb.href && !last ? (
                <a className="pf-v6-c-breadcrumb__link" href={crumb.href}>
                  {crumb.label}
                </a>
              ) : (
                <span className="pf-v6-c-breadcrumb__link pf-m-current" aria-current="page">
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
