import type { JSX } from 'react';
import type { PageModel } from '../types/index.ts';
import { Masthead } from '../components/Masthead.tsx';
import { Sidebar } from '../components/Sidebar.tsx';
import { Search } from '../components/Search.tsx';
import { Footer } from '../components/Footer.tsx';
import { Article } from './Article.tsx';
import { Landing } from './Landing.tsx';
import { NotFound } from './NotFound.tsx';

/**
 * Applies the reader's saved theme before the first paint.
 *
 * <p>Inline and synchronous on purpose: a theme applied by a deferred script is a white
 * flash on every navigation for somebody who chose dark. Wrapped in try/catch because
 * `localStorage` throws outright in a browser set to block site data, and a documentation
 * page must not go blank over a preference.
 */
const THEME_BOOT = `try{var t=localStorage.getItem('kd-theme');if(t==='dark'||t==='light'){document.documentElement.dataset.kdTheme=t;if(t==='dark')document.documentElement.classList.add('pf-v6-theme-dark')}}catch(e){}`;

export const Document = ({ page }: { page: PageModel }): JSX.Element => {
  const body =
    page.layout === 'landing' ? (
      <Landing page={page} />
    ) : page.layout === 'notFound' ? (
      <NotFound page={page} />
    ) : (
      <Article page={page} />
    );

  const description = page.abstract || page.title;

  return (
    <html lang={page.language.htmlLang} dir={page.language.direction}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`${page.title} — ${page.strings['site.title']}`}</title>
        <meta name="description" content={description} />
        <meta name="generator" content="Keydra documentation platform" />
        {page.canonical ? <link rel="canonical" href={page.canonical} /> : null}

        {/* One alternate per published language, so a crawler and a reader agree about
            which pages are the same page. `x-default` points at the default language. */}
        {page.alternates
          .filter((alternate) => alternate.href)
          .map((alternate) => (
            <link
              key={alternate.language.code}
              rel="alternate"
              hrefLang={alternate.language.htmlLang}
              href={alternate.href}
            />
          ))}

        <meta property="og:type" content="article" />
        <meta property="og:title" content={page.title} />
        <meta property="og:description" content={description} />
        <meta property="og:site_name" content={page.strings['site.title']} />
        <meta property="og:locale" content={page.language.htmlLang} />
        {page.canonical ? <meta property="og:url" content={page.canonical} /> : null}

        <meta name="keydra:version" content={page.version.id} />
        <meta name="keydra:language" content={page.language.code} />
        <meta name="keydra:page-id" content={page.pageId} />

        <link rel="icon" href={page.assets.favicon} type="image/svg+xml" />
        {page.assets.css.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="kd-body">
        <a className="pf-v6-c-skip-to-content kd-skip" href="#kd-main">
          <span className="pf-v6-c-button pf-m-primary">
            <span className="pf-v6-c-button__text">{page.strings['site.skipToContent']}</span>
          </span>
        </a>

        <div className="pf-v6-c-page kd-page">
          <Masthead page={page} />
          {/* The 404 has no navigation to draw — it is not in the tree — so the sidebar
              would be an empty column beside an apology. */}
          {page.nav.length > 0 ? <Sidebar page={page} /> : null}
          <main className="pf-v6-c-page__main kd-main" id="kd-main" tabIndex={-1}>
            <div className="pf-v6-c-page__main-body kd-main__body">{body}</div>
            <Footer page={page} />
          </main>
        </div>

        <Search page={page} />

        {/* The handful of strings the runtime needs. Serialised rather than compiled in,
            so a language is still a file and the script stays one bundle for every page. */}
        <script
          type="application/json"
          id="kd-strings"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              Object.fromEntries(
                Object.entries(page.strings).filter(([key]) =>
                  /^(search|code|theme)\./.test(key),
                ),
              ),
            ),
          }}
        />
        <noscript>
          <p className="kd-noscript">{page.strings['search.unavailable']}</p>
        </noscript>

        {page.assets.js.map((src) => (
          <script key={src} src={src} type="module" defer />
        ))}
      </body>
    </html>
  );
};
