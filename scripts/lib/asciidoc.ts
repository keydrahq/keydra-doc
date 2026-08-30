/**
 * AsciiDoc in, PatternFly markup out.
 *
 * <p>A custom Asciidoctor converter rather than a pass of regular expressions over the
 * default HTML: an admonition has to become a `pf-v6-c-alert`, a table a `pf-v6-c-table`,
 * and rewriting one shape into another after the fact is how a nested list inside a
 * warning inside a table stops being either.
 */
import { ConverterFactory, Html5Converter, loadFile } from '@asciidoctor/core';
import { readFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import type { Strings } from './config.ts';

export interface Heading {
  id: string;
  text: string;
  level: number;
}

export interface ConvertedDocument {
  /** The stable, language-neutral identifier — `[id="getting-started"]` on the assembly. */
  id: string;
  title: string;
  /** One sentence for the card grid, the search index and the page description. */
  abstract: string;
  html: string;
  headings: Heading[];
  /** Repository-relative paths of every file that contributed, for the edit link. */
  sources: string[];
  attributes: Record<string, string>;
  /** `draft` pages never reach a production build. */
  status: 'published' | 'draft' | 'deprecated';
  keywords: string[];
}

/**
 * Turn Asciidoctor's entity references back into characters.
 *
 * <p>`getDocumentTitle()` and the section titles come back already substituted — an
 * apostrophe arrives as `&#8217;`. Those strings are then handed to React, which escapes
 * the ampersand, and a page title reads "Keydra&#8217;yı" in the browser tab. React is
 * right to escape; the fix is to give it text rather than markup.
 */
export const decodeEntities = (text: string): string =>
  text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/g, '\u00a0')
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&ldquo;/g, '\u201c')
    .replace(/&rdquo;/g, '\u201d')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // Last, so a literal "&amp;#8217;" in the source is not turned into a character.
    .replace(/&amp;/g, '&');

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Admonition labels, per language.
 *
 * <p>Asciidoctor's own `NOTE`/`WARNING` captions are English words baked into the
 * converter. A Turkish page that says "WARNING" over Turkish prose is a page that was
 * translated everywhere except the part the eye goes to first.
 */
const ADMONITION_KEYS: Record<string, string> = {
  note: 'admonition.note',
  tip: 'admonition.tip',
  important: 'admonition.important',
  warning: 'admonition.warning',
  caution: 'admonition.caution',
};

const ALERT_VARIANT: Record<string, string> = {
  note: 'info',
  tip: 'success',
  important: 'warning',
  warning: 'warning',
  caution: 'danger',
};

/** The PatternFly icon each admonition wears, as an inline SVG path set. */
const ALERT_ICON: Record<string, string> = {
  info: 'M504 256c0 136.997-111.043 248-248 248S8 392.997 8 256C8 119.083 119.043 8 256 8s248 111.083 248 248zm-248 50c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z',
  success:
    'M504 256c0 136.967-111.033 248-248 248S8 392.967 8 256 119.033 8 256 8s248 111.033 248 248zM227.314 387.314l184-184c6.248-6.248 6.248-16.379 0-22.627l-22.627-22.627c-6.248-6.249-16.379-6.249-22.628 0L216 308.118l-70.059-70.059c-6.248-6.248-16.379-6.248-22.628 0l-22.627 22.627c-6.248 6.248-6.248 16.379 0 22.627l104 104c6.249 6.249 16.379 6.249 22.628.001z',
  warning:
    'M569.517 440.013C587.975 472.007 564.806 512 527.94 512H48.054c-36.937 0-59.999-40.055-41.577-71.987L246.423 23.985c18.467-32.009 64.72-31.951 83.154 0l239.94 416.028zM288 354c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z',
  danger:
    'M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm121.6 313.1c4.7 4.7 4.7 12.3 0 17L338 377.6c-4.7 4.7-12.3 4.7-17 0L256 312l-65.1 65.6c-4.7 4.7-12.3 4.7-17 0L134.4 338c-4.7-4.7-4.7-12.3 0-17l65.6-65-65.6-65.1c-4.7-4.7-4.7-12.3 0-17l39.6-39.6c4.7-4.7 12.3-4.7 17 0l65 65.7 65.1-65.6c4.7-4.7 12.3-4.7 17 0l39.6 39.6c4.7 4.7 4.7 12.3 0 17L312 256l65.6 65.1z',
  viewBox: '0 0 512 512',
};

const icon = (variant: string): string => {
  const path = ALERT_ICON[variant] ?? ALERT_ICON.info!;
  const viewBox = variant === 'warning' ? '0 0 576 512' : '0 0 512 512';
  return `<svg class="pf-v6-svg" viewBox="${viewBox}" fill="currentColor" aria-hidden="true" role="img" width="1em" height="1em"><path d="${path}"/></svg>`;
};

export interface ConverterOptions {
  language: string;
  strings: Strings;
  /** Resolves an `xref:` target to a site URL, or undefined when it does not resolve. */
  resolveXref?: (target: string) => string | undefined;
  /** Collects every unresolved reference so validation can fail on them. */
  onBrokenXref?: (target: string) => void;
  /**
   * Targets already reported for this document.
   *
   * <p>The abstract is read by converting the document's first block a second time, so a
   * reference inside it reaches the callback twice. Set by `convert`, not by the caller.
   */
  reported?: Set<string>;
}

/**
 * Register the PatternFly converter once per process, parameterised per call through a
 * mutable slot. Asciidoctor's registry is global, and creating a converter per document
 * leaks registrations.
 */
let active: ConverterOptions;

const html5 = Html5Converter.create();

/**
 * Asciidoctor 4 is asynchronous: `getContent()` returns a promise, and so must every
 * override that reads one. The built-in converter is still called synchronously for the
 * shapes this one does not touch.
 */
class PatternFlyConverter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async convert(node: any, transform?: string): Promise<string> {
    const name = transform ?? node.getNodeName();

    switch (name) {
      case 'admonition':
        return await this.admonition(node);
      case 'listing':
      case 'literal':
        return this.listing(node);
      case 'table':
        return await this.table(node);
      case 'section':
        return await this.section(node);
      case 'inline_anchor':
        return await this.inlineAnchor(node);
      case 'image':
        return await this.image(node);
      default:
        return html5.convert(node, transform);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async admonition(node: any): Promise<string> {
    const kind = String(node.getAttribute('name'));
    const variant = ALERT_VARIANT[kind] ?? 'info';
    const label = active.strings[ADMONITION_KEYS[kind] ?? 'admonition.note'] ?? kind;
    const title = node.getTitle();
    return [
      `<div class="pf-v6-c-alert pf-m-${variant} pf-m-inline kd-admonition" aria-label="${escapeHtml(label)}">`,
      `<div class="pf-v6-c-alert__icon">${icon(variant)}</div>`,
      `<div class="pf-v6-c-alert__title"><span class="pf-v6-screen-reader">${escapeHtml(label)}:</span>${escapeHtml(title || label)}</div>`,
      `<div class="pf-v6-c-alert__description">${await node.getContent()}</div>`,
      `</div>`,
    ].join('');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listing(node: any): string {
    const language = String(node.getAttribute('language') ?? '').toLowerCase() || 'text';
    const title = node.getTitle();
    // The raw lines, and then only the substitutions the block asked for.
    //
    // A listing block substitutes nothing by default, which is right for code — but it also
    // meant every `{image-standalone}` and `{chart-repository}` in a command reached the
    // published page as those literal words, so the manual told readers to type an attribute
    // name. Honouring the block's own `subs` fixes that where an author wrote
    // `subs="+attributes"` and changes nothing anywhere else, which is what a block that
    // shows braces on purpose needs.
    const raw = node.getSourceLines().join('\n');
    let subs: string[] = [];
    try {
      subs = (node.getSubstitutions?.() ?? []).map(String);
    } catch {
      subs = [];
    }
    // Done here rather than through Asciidoctor's own apply_subs, which this build does not
    // expose on the node. One rule, and it leaves anything it does not recognise alone — so a
    // shell brace expansion or a JSON object in a block that asked for attributes still reads
    // as itself.
    const attributes = node.getDocument().getAttributes();
    const source = subs.includes('attributes')
      ? raw.replace(/\{([a-zA-Z0-9_][a-zA-Z0-9_-]*)\}/g, (whole: string, name: string) =>
          Object.hasOwn(attributes, name) ? String(attributes[name]) : whole,
        )
      : raw;
    const copyLabel = active.strings['code.copy'] ?? 'Copy';
    const copiedLabel = active.strings['code.copied'] ?? 'Copied';
    // The code is emitted escaped and marked; `highlight.ts` replaces the inner <code>
    // with themed spans after conversion, because Shiki is asynchronous and this is not.
    return [
      `<div class="kd-code" data-kd-code>`,
      title ? `<div class="kd-code__title">${escapeHtml(title)}</div>` : '',
      `<div class="kd-code__bar">`,
      `<span class="kd-code__lang">${escapeHtml(language)}</span>`,
      `<button type="button" class="pf-v6-c-button pf-m-link pf-m-inline kd-code__copy" data-kd-copy data-copied="${escapeHtml(copiedLabel)}">`,
      `<span class="pf-v6-c-button__text">${escapeHtml(copyLabel)}</span></button>`,
      `</div>`,
      `<pre class="kd-code__pre" data-kd-lang="${escapeHtml(language)}" tabindex="0"><code>${escapeHtml(source)}</code></pre>`,
      `</div>`,
    ].join('');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async table(node: any): Promise<string> {
    // Asciidoctor already emits `<caption class="title">`; only the table itself needs
    // PatternFly's classes adding to the ones it wrote.
    const inner = (await html5.convert(node, 'table')).replace(
      /<table class="([^"]*)"/,
      // Not `pf-m-grid-md`: PatternFly's stacked mode needs a `data-label` on every cell
      // to know what each row's fields are called, and Asciidoctor writes none. A wide
      // table scrolls inside `.kd-scroll` instead, which needs nothing from the markup.
      '<table class="pf-v6-c-table kd-table $1"',
    );
    // A wide table must scroll inside itself rather than making the page scroll.
    return `<div class="kd-scroll" tabindex="0" role="region" aria-label="${escapeHtml(
      node.getTitle() || active.strings['table.label'] || 'Table',
    )}">${inner}</div>`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async section(node: any): Promise<string> {
    const level = node.getLevel();
    const id = node.getId();
    const anchorLabel = (active.strings['heading.anchor'] ?? 'Link to this section').replace(
      '{title}',
      node.getTitle(),
    );
    const tag = `h${Math.min(level + 1, 6)}`;
    return [
      `<section class="kd-section kd-section--${level}"${id ? ` id="${escapeHtml(id)}"` : ''}>`,
      `<${tag} class="kd-heading kd-heading--${level}">`,
      node.getTitle(),
      id
        ? `<a class="kd-heading__anchor" href="#${escapeHtml(id)}" aria-label="${escapeHtml(anchorLabel)}">#</a>`
        : '',
      `</${tag}>`,
      await node.getContent(),
      `</section>`,
    ].join('');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async inlineAnchor(node: any): Promise<string> {
    if (node.getType() === 'xref') {
      const target = String(node.getAttribute('refid') ?? node.getTarget() ?? '');
      const resolved = active.resolveXref?.(target);
      if (resolved) {
        return `<a href="${escapeHtml(resolved)}">${node.getText() ?? target}</a>`;
      }
      if (target && !target.startsWith('#') && !active.reported!.has(target)) {
        active.reported!.add(target);
        active.onBrokenXref?.(target);
      }
      return `<a href="#${escapeHtml(target)}">${node.getText() ?? target}</a>`;
    }
    // `await`: the built-in converter is asynchronous in Asciidoctor 4, and a missing one
    // here renders every external link as the string "[object Promise]".
    const converted = String(await html5.convert(node, 'inline_anchor'));
    // Anything leaving the site says so, and opens where the reader expects.
    if (/^https?:\/\//.test(String(node.getTarget() ?? ''))) {
      return converted.replace('<a ', '<a rel="noopener noreferrer" class="kd-external" ');
    }
    return converted;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async image(node: any): Promise<string> {
    const converted = String(await html5.convert(node, 'image')).replace(
      '<img ',
      '<img loading="lazy" ',
    );
    // A screenshot is 1,568 pixels wide and the prose is 736, so what the page shows is
    // an image with unreadable text in it. Wrapping it in a link to itself is the whole
    // fix: the page keeps its measure, and a reader who needs to read a label in the
    // picture can open it at the size it was taken. Done here rather than with `link=`
    // on each macro because the target is `imagesdir` plus the file name, and that path
    // carries the language and the version — which no module should have to know.
    if (/class="[^"]*\bimageblock\b/.test(converted) && !/<a\s/.test(converted)) {
      const source = /<img[^>]*\bsrc="([^"]*)"/.exec(converted)?.[1];
      if (source) {
        const label = active.strings['image.open'] ?? 'Open the full-size image';
        return converted.replace(
          /(<img\b[^>]*>)/,
          `<a class="kd-figure__link" href="${source}" target="_blank" rel="noopener noreferrer" aria-label="${label}">$1</a>`,
        );
      }
    }
    return converted;
  }
}

ConverterFactory.register(new PatternFlyConverter(), ['html5']);

const flattenHeadings = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any,
): Heading[] =>
  document
    .findBy({ context: 'section' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((section: any) => section.getLevel() >= 1 && section.getLevel() <= 2)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((section: any) => ({
      id: String(section.getId() ?? ''),
      text: decodeEntities(String(section.getTitle() ?? '')),
      level: section.getLevel() as number,
    }))
    .filter((heading: Heading) => heading.id !== '');

/**
 * Every file an assembly pulled in, so the edit link and the change detector both know
 * what a page is actually made of.
 */
const includedFiles = (source: string, from: string, repoRoot: string): string[] => {
  const found: string[] = [];
  for (const match of source.matchAll(/^include::([^[\]]+)\[/gm)) {
    found.push(relative(repoRoot, join(dirname(from), match[1]!)));
  }
  return found;
};

export const convert = async (
  file: string,
  options: ConverterOptions & {
    attributes?: Record<string, string>;
    repoRoot: string;
    /** The language's content root, which is how far an include may reach. */
    contentRoot: string;
  },
): Promise<ConvertedDocument> => {
  active = { ...options, reported: new Set<string>() };
  const source = readFileSync(file, 'utf8');

  const document = await loadFile(file, {
    safe: 'server',
    // The jail is the language's content root, not the assembly's own directory: an
    // assembly includes modules and snippets that are its siblings' children, and a jail
    // one level too deep refuses every one of them.
    base_dir: options.contentRoot,
    attributes: {
      showtitle: false,
      // Anchors are the page's contract with every link anyone has ever saved.
      idprefix: '',
      idseparator: '-',
      'source-highlighter': undefined,
      sectanchors: false,
      icons: 'font',
      // A caption is a name, not a number. "Table 1." is a cross-reference convention
      // from print, and nothing here cross-references a table by its number.
      'table-caption': '',
      'figure-caption': '',
      'example-caption': '',
      experimental: true,
      // Included modules resolve their own includes relative to themselves.
      relfilesuffix: '',
      ...options.attributes,
    },
  });

  const html = await document.convert();
  const attributes = document.getAttributes() as Record<string, string>;
  const abstract =
    attributes.description ??
    String((await document.getBlocks()[0]?.getContent?.()) ?? '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const status = (attributes['page-status'] ?? 'published') as ConvertedDocument['status'];

  return {
    id: String(document.getId() ?? basename(file, '.adoc').replace(/^assembly_/, '')),
    title: decodeEntities(String(document.getDocumentTitle() ?? '')),
    abstract: decodeEntities(abstract).slice(0, 320),
    html,
    headings: flattenHeadings(document),
    sources: [relative(options.repoRoot, file), ...includedFiles(source, file, options.repoRoot)],
    attributes,
    status,
    keywords: String(attributes['page-keywords'] ?? '')
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean),
  };
};
