import type { JSX } from 'react';
import type { PageModel } from '../types/index.ts';
import { SearchIcon, TimesIcon } from './Icons.tsx';

/**
 * The search overlay, rendered closed and empty.
 *
 * <p>Everything about it that can be static is: the dialog, the input, the empty state and
 * the hint that says which language and version is being searched. The script fetches one
 * index for this language and this version, and fills the list. A browser without
 * JavaScript never opens it and is told so where the button would be.
 */
export const Search = ({ page }: { page: PageModel }): JSX.Element => {
  const t = (key: string) => page.strings[key] ?? '';
  const hint = t('search.hint')
    .replace('{language}', page.language.endonym)
    .replace('{version}', page.version.label);

  return (
    <div
      className="kd-search"
      id="kd-search"
      hidden
      data-kd-search
      data-index={page.searchIndexUrl}
      data-language={page.language.code}
    >
      <div className="kd-search__backdrop" data-kd-search-close />
      <div
        className="pf-v6-c-modal-box pf-m-lg kd-search__box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kd-search-title"
      >
        <div className="kd-search__header">
          <h2 className="pf-v6-screen-reader" id="kd-search-title">
            {t('search.label')}
          </h2>
          <div className="pf-v6-c-text-input-group kd-search__input">
            <div className="pf-v6-c-text-input-group__main pf-m-icon">
              <span className="pf-v6-c-text-input-group__text">
                <span className="pf-v6-c-text-input-group__icon">
                  <SearchIcon />
                </span>
                <input
                  className="pf-v6-c-text-input-group__text-input"
                  type="search"
                  id="kd-search-input"
                  autoComplete="off"
                  spellCheck="false"
                  placeholder={t('search.placeholder')}
                  aria-label={t('search.placeholder')}
                  aria-describedby="kd-search-hint"
                  aria-controls="kd-search-results"
                  data-kd-search-input
                />
              </span>
            </div>
          </div>
          <button
            type="button"
            className="pf-v6-c-button pf-m-plain kd-search__close"
            aria-label={t('search.close')}
            data-kd-search-close
          >
            <span className="pf-v6-c-button__icon">
              <TimesIcon />
            </span>
          </button>
        </div>

        <p className="kd-search__hint" id="kd-search-hint">
          {hint}
        </p>

        <div
          className="kd-search__results"
          id="kd-search-results"
          role="listbox"
          aria-label={t('search.results')}
          data-kd-search-results
        />

        <p className="kd-search__status" data-kd-search-status role="status" aria-live="polite" />
      </div>
    </div>
  );
};
