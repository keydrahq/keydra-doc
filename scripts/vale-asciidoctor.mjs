#!/usr/bin/env node
/**
 * The `asciidoctor` Vale expects to find on PATH.
 *
 * <p>Vale's AsciiDoc package shells out to the Ruby Asciidoctor to turn a document into
 * HTML before it lints the prose. There is no Ruby in this toolchain and adding one for a
 * lint step would be a second language to install; this is the same conversion through
 * `@asciidoctor/core`, which is already a dependency.
 *
 * <p>Vale invokes it as `asciidoctor -s -a notitle! -a attribute-missing=drop
 * --safe-mode secure -`, reading the document on stdin and expecting HTML on stdout. The
 * built-in HTML converter is used deliberately — Vale is linting the words, and the
 * PatternFly markup this site publishes would only get in the way.
 */
import { load } from '@asciidoctor/core';

const read = () =>
  new Promise((resolve, reject) => {
    let text = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (text += chunk));
    process.stdin.on('end', () => resolve(text));
    process.stdin.on('error', reject);
  });

// `-a name=value` and `-a name!` pairs, in the order Vale passes them.
const attributes = { showtitle: false };
const argv = process.argv.slice(2);
for (let index = 0; index < argv.length; index += 1) {
  if (argv[index] !== '-a' && argv[index] !== '--attribute') continue;
  const entry = argv[index + 1] ?? '';
  if (entry.endsWith('!')) attributes[entry.slice(0, -1)] = null;
  else {
    const at = entry.indexOf('=');
    if (at > 0) attributes[entry.slice(0, at)] = entry.slice(at + 1);
    else attributes[entry] = '';
  }
}

/**
 * Carry `// vale ...` directives through the conversion.
 *
 * <p>Asciidoctor drops line comments before it converts, so a `// vale Rule = NO` in a
 * module never reached Vale and the escape hatch silently did nothing. Vale is reading
 * HTML here, so the directive has to arrive as an HTML comment — and as a one-line inline
 * passthrough rather than a passthrough block, so the line numbers Vale reports still
 * point at the line the writer is looking at.
 *
 * <p>The hatch is for one case and it is a real one: this documentation quotes interface
 * labels verbatim, and an interface is allowed to spell a button in a way an American
 * English style rule objects to.
 */
const carryDirectives = (source) =>
  source.replace(/^\/\/\s*(vale\b[^\n]*)$/gm, (_, directive) => `+++<!-- ${directive} -->+++`);

try {
  const document = await load(carryDirectives(await read()), {
    safe: 'secure',
    standalone: false,
    attributes,
  });
  process.stdout.write(await document.convert());
} catch (failure) {
  // A file Vale cannot convert should fail the lint loudly, not lint as empty.
  process.stderr.write(`${failure instanceof Error ? failure.message : String(failure)}\n`);
  process.exit(1);
}
