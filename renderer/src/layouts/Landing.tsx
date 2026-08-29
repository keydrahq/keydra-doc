import type { JSX } from 'react';
import type { PageModel } from '../types/index.ts';
import { AngleRightIcon } from '../components/Icons.tsx';

/**
 * The documentation home page.
 *
 * <p>A short statement of what Keydra is, written in AsciiDoc like everything else, and
 * then a card per section of the navigation. The cards are generated from the navigation
 * and each section's first page, so a section added to `nav.yml` appears here without
 * anybody remembering to add it — which is the failure mode of a hand-written index.
 */
export const Landing = ({ page }: { page: PageModel }): JSX.Element => (
  <div className="kd-landing">
    <header className="kd-landing__header">
      <h1 className="kd-landing__title">{page.title}</h1>
      {page.abstract ? <p className="kd-landing__abstract">{page.abstract}</p> : null}
    </header>

    {page.bodyHtml ? (
      <div className="kd-prose kd-landing__intro" dangerouslySetInnerHTML={{ __html: page.bodyHtml }} />
    ) : null}

    <h2 className="kd-landing__sectionsTitle">{page.strings['landing.browse']}</h2>
    <ul className="kd-cards" role="list">
      {(page.sections ?? []).map((section) => (
        <li key={section.id}>
          <a className="pf-v6-c-card pf-m-clickable kd-card" href={section.href}>
            <div className="pf-v6-c-card__title">
              <h3 className="pf-v6-c-card__title-text kd-card__title">
                {section.label}
                <AngleRightIcon className="kd-card__arrow" />
              </h3>
            </div>
            <div className="pf-v6-c-card__body kd-card__body">{section.abstract}</div>
            <div className="pf-v6-c-card__footer kd-card__footer">
              {(page.strings[
                section.pages === 1 ? 'landing.sectionPages_one' : 'landing.sectionPages_other'
              ] ?? '').replace('{count}', String(section.pages))}
            </div>
          </a>
        </li>
      ))}
    </ul>
  </div>
);
