/**
 * Syntax highlighting, done once at build time.
 *
 * <p>Shiki with both a light and a dark theme in one pass: it writes the dark colour into
 * a CSS variable beside the light one, so a theme switch is a stylesheet rule rather than
 * a second highlighting pass or a re-render in the browser. Nothing about highlighting
 * reaches the reader as JavaScript.
 */
import { createHighlighter, type Highlighter } from 'shiki';

/**
 * The languages the documentation actually uses.
 *
 * <p>Loading every grammar Shiki ships would add seconds to a build for languages no page
 * contains. A block whose language is not here still renders — unhighlighted, monospaced,
 * copyable — and the build says which one was missing so this list can grow.
 */
const LANGUAGES = [
  'bash',
  'shell',
  'console',
  'java',
  'javascript',
  'typescript',
  'tsx',
  'json',
  'yaml',
  'properties',
  'ini',
  'sql',
  'xml',
  'html',
  'css',
  'http',
  'docker',
  'diff',
  'graphql',
  'python',
  'text',
] as const;

const ALIASES: Record<string, string> = {
  sh: 'bash',
  zsh: 'bash',
  dockerfile: 'docker',
  containerfile: 'docker',
  yml: 'yaml',
  js: 'javascript',
  ts: 'typescript',
  adoc: 'text',
  asciidoc: 'text',
  redis: 'shell',
  'redis-cli': 'shell',
  none: 'text',
};

let highlighter: Highlighter | null = null;

export const unknownLanguages = new Set<string>();

export const highlighterReady = async (): Promise<Highlighter> => {
  highlighter ??= await createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: [...LANGUAGES],
  });
  return highlighter;
};

const unescape = (html: string): string =>
  html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

/**
 * Replace every `<pre data-kd-lang="…"><code>…</code></pre>` with highlighted markup.
 *
 * <p>A pass over the produced HTML rather than part of the converter, because Shiki is
 * asynchronous and Asciidoctor's conversion is not.
 */
export const highlight = async (html: string): Promise<string> => {
  if (!html.includes('data-kd-lang=')) return html;
  const shiki = await highlighterReady();
  const loaded = new Set(shiki.getLoadedLanguages());

  return html.replace(
    /<pre class="kd-code__pre" data-kd-lang="([^"]*)"([^>]*)><code>([\s\S]*?)<\/code><\/pre>/g,
    (whole, declared: string, attributes: string, body: string) => {
      const language = ALIASES[declared] ?? declared;
      if (!loaded.has(language)) {
        if (language && language !== 'text') unknownLanguages.add(declared);
        return whole;
      }
      const rendered = shiki.codeToHtml(unescape(body), {
        lang: language,
        themes: { light: 'github-light', dark: 'github-dark' },
        defaultColor: 'light',
        // The <pre> Shiki produces is thrown away; only its <code> is kept, so the
        // documentation's own frame, padding and focus ring survive.
        structure: 'classic',
      });
      const inner = /<code[^>]*>([\s\S]*)<\/code>/.exec(rendered)?.[1] ?? body;
      return `<pre class="kd-code__pre shiki" data-kd-lang="${declared}"${attributes}><code>${inner}</code></pre>`;
    },
  );
};
