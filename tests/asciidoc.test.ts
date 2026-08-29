import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { convert } from '../scripts/lib/asciidoc.ts';
import { strings } from '../scripts/lib/config.ts';

const en = strings('en');
const tr = strings('tr');

const write = (body: string): { file: string; root: string } => {
  const root = mkdtempSync(join(tmpdir(), 'kd-adoc-'));
  mkdirSync(join(root, 'assemblies'), { recursive: true });
  const file = join(root, 'assemblies', 'assembly_test.adoc');
  writeFileSync(file, body);
  return { file, root };
};

const render = async (body: string, language = 'en') => {
  const { file, root } = write(body);
  return convert(file, {
    language,
    strings: language === 'tr' ? tr : en,
    repoRoot: root,
    contentRoot: root,
  });
};

describe('conversion', () => {
  it('reads the id, the title and the description', async () => {
    const document = await render(
      ['[id="thing"]', '= A title', ':description: What it is.', ':context: thing', '', 'Body.'].join('\n'),
    );
    expect(document.id).toBe('thing');
    expect(document.title).toBe('A title');
    expect(document.abstract).toBe('What it is.');
  });

  it('turns an entity back into a character, so React does not escape the ampersand', async () => {
    const document = await render(['[id="t"]', "= Keydra's page", ':context: t', '', 'Body.'].join('\n'));
    expect(document.title).not.toContain('&#');
    expect(document.title).toContain('’');
  });

  it('gives every section a stable anchor', async () => {
    const document = await render(
      ['[id="t"]', '= T', ':context: t', '', '== Adding a connection', '', 'x'].join('\n'),
    );
    expect(document.headings.map((heading) => heading.id)).toEqual(['adding-a-connection']);
  });

  it('renders an admonition as a PatternFly alert, labelled in the page language', async () => {
    const body = ['[id="t"]', '= T', ':context: t', '', 'NOTE: Careful.'].join('\n');
    const english = await render(body);
    expect(english.html).toContain('pf-v6-c-alert');
    expect(english.html).toContain('Note');

    const turkish = await render(body, 'tr');
    expect(turkish.html).toContain('pf-v6-c-alert');
    expect(turkish.html).toContain('Not');
    expect(turkish.html).not.toContain('>Note<');
  });

  it('wraps a table so a wide one scrolls inside itself', async () => {
    const document = await render(
      ['[id="t"]', '= T', ':context: t', '', '|===', '| a | b', '| 1 | 2', '|==='].join('\n'),
    );
    expect(document.html).toContain('kd-scroll');
    expect(document.html).toContain('pf-v6-c-table');
  });

  it('gives a code block a copy button and keeps the source exactly', async () => {
    const document = await render(
      ['[id="t"]', '= T', ':context: t', '', '[source,bash]', '----', 'echo "hi"  # a comment', '----'].join('\n'),
    );
    expect(document.html).toContain('data-kd-copy');
    expect(document.html).toContain('data-kd-lang="bash"');
    expect(document.html).toContain('echo &quot;hi&quot;  # a comment');
  });

  it('resolves a cross-reference through the resolver, and reports one that does not', async () => {
    const broken: string[] = [];
    const { file, root } = write(
      [
        '[id="t"]',
        '= T',
        ':context: t',
        '',
        'See xref:elsewhere.adoc[there] and xref:nowhere.adoc[nothing].',
      ].join('\n'),
    );
    const document = await convert(file, {
      language: 'en',
      strings: en,
      repoRoot: root,
      contentRoot: root,
      resolveXref: (target) => (target.startsWith('elsewhere') ? '/docs/en/0.1/elsewhere/' : undefined),
      onBrokenXref: (target) => broken.push(target),
    });
    expect(document.html).toContain('href="/docs/en/0.1/elsewhere/"');
    // Asciidoctor hands the resolver the reference id, which is the file name without
    // its extension. Reported once, even though the abstract re-converts the paragraph.
    expect(broken).toEqual(['nowhere']);
  });

  it('marks a link that leaves the site', async () => {
    const document = await render(
      ['[id="t"]', '= T', ':context: t', '', 'https://example.com[Elsewhere]'].join('\n'),
    );
    expect(document.html).toContain('rel="noopener noreferrer"');
  });

  it('reads the page status, so a draft can be kept out of a production build', async () => {
    const document = await render(
      ['[id="t"]', '= T', ':context: t', ':page-status: draft', '', 'x'].join('\n'),
    );
    expect(document.status).toBe('draft');
  });
});
