import type { JSX } from 'react';
import type { PageModel } from '../types/index.ts';
import { SearchIcon } from '../components/Icons.tsx';

export const NotFound = ({ page }: { page: PageModel }): JSX.Element => (
  <div className="kd-notfound">
    <div className="pf-v6-c-empty-state pf-m-lg">
      <div className="pf-v6-c-empty-state__content">
        <h1 className="pf-v6-c-empty-state__title-text kd-notfound__title">
          {page.strings['notFound.title']}
        </h1>
        <div className="pf-v6-c-empty-state__body">{page.strings['notFound.body']}</div>
        <div className="pf-v6-c-empty-state__actions kd-notfound__actions">
          <a className="pf-v6-c-button pf-m-primary" href={page.homeUrl}>
            <span className="pf-v6-c-button__text">{page.strings['notFound.home']}</span>
          </a>
          <button type="button" className="pf-v6-c-button pf-m-link" data-kd-search-open>
            <span className="pf-v6-c-button__icon pf-m-start">
              <SearchIcon />
            </span>
            <span className="pf-v6-c-button__text">{page.strings['notFound.search']}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);
