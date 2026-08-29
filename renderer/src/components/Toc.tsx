import type { JSX } from 'react';
import type { PageModel } from '../types/index.ts';

/**
 * "On this page".
 *
 * <p>Built from the document's own section tree rather than from the produced HTML, so an
 * entry and its heading always carry the same anchor. Sticky on a wide screen and a
 * collapsed disclosure on a narrow one, which is what `<details>` gives without a line of
 * script — the enhancement only adds the highlight that follows the reader down the page.
 */
export const Toc = ({ page }: { page: PageModel }): JSX.Element | null => {
  if (page.headings.length < 2) return null;
  return (
    <aside className="kd-toc" aria-labelledby="kd-toc-title">
      <details className="kd-toc__details" open>
        <summary className="kd-toc__summary">
          <span className="kd-toc__title" id="kd-toc-title">
            {page.strings['toc.title']}
          </span>
        </summary>
        <nav aria-label={page.strings['toc.label']}>
          <ul className="kd-toc__list" role="list">
            {page.headings.map((heading) => (
              <li className={`kd-toc__item kd-toc__item--${heading.level}`} key={heading.id}>
                <a className="kd-toc__link" href={`#${heading.id}`} data-kd-toc-link={heading.id}>
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </details>
    </aside>
  );
};
