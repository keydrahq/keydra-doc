import type { JSX } from 'react';
import type { PageModel } from '../types/index.ts';
import { Breadcrumb } from '../components/Breadcrumb.tsx';
import { Toc } from '../components/Toc.tsx';
import { Pager } from '../components/Footer.tsx';
import { ExternalLinkIcon } from '../components/Icons.tsx';

const DevelopmentNotice = ({ page }: { page: PageModel }): JSX.Element | null => {
  if (page.version.state !== 'development') return null;
  return (
    <div className="pf-v6-c-alert pf-m-info pf-m-inline kd-version-notice" aria-live="off">
      <div className="pf-v6-c-alert__title">{page.strings['version.development']}</div>
      <div className="pf-v6-c-alert__description">{page.strings['version.developmentBody']}</div>
    </div>
  );
};

export const Article = ({ page }: { page: PageModel }): JSX.Element => (
  <div className="kd-article-grid">
    <article className="kd-article" lang={page.language.htmlLang}>
      <Breadcrumb page={page} />
      <DevelopmentNotice page={page} />
      <h1 className="kd-article__title">{page.title}</h1>
      {page.abstract ? <p className="kd-article__abstract">{page.abstract}</p> : null}
      <div
        className="kd-prose"
        // The article is Asciidoctor's output, produced at build time from a file in this
        // repository. There is no user input anywhere in this pipeline.
        dangerouslySetInnerHTML={{ __html: page.bodyHtml ?? '' }}
      />
      <Pager page={page} />
      {page.editUrl ? (
        <p className="kd-article__edit">
          <a className="kd-external" href={page.editUrl} rel="noopener noreferrer">
            {page.strings['page.editThis']} <ExternalLinkIcon />
          </a>
        </p>
      ) : null}
    </article>
    <Toc page={page} />
  </div>
);
