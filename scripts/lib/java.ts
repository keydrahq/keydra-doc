import { readFileSync } from 'node:fs';
import fg from 'fast-glob';
import { backendRoot, repoRelative } from './paths.ts';

/** Every `.java` file under the backend's main sources, as absolute paths. */
export const backendSources = (): string[] =>
  fg.sync('src/main/java/**/*.java', { cwd: backendRoot, absolute: true }).sort();

export interface JavaFile {
  path: string;
  /** Repository-relative, which is the only form allowed to reach a generated artefact. */
  relative: string;
  source: string;
}

export const readJava = (path: string): JavaFile => ({
  path,
  relative: repoRelative(path),
  source: readFileSync(path, 'utf8'),
});

/**
 * Strip block and line comments, keeping the source's line count.
 *
 * <p>Every scanner below reads annotations, and an annotation named inside a Javadoc
 * `{@link}` is prose about the code rather than the code. Replacing comment bodies with
 * spaces rather than deleting them keeps offsets usable for reporting a line number.
 */
export const withoutComments = (source: string): string =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));

/** Read a string literal out of an annotation's arguments: `@Path("/x")` -> `/x`. */
export const annotationValue = (text: string, annotation: string): string | undefined => {
  const pattern = new RegExp(`@${annotation}\\s*\\(\\s*(?:value\\s*=\\s*)?"((?:[^"\\\\]|\\\\.)*)"`);
  return pattern.exec(text)?.[1];
};

/** Whether a bare or parameterised annotation appears in the given text. */
export const hasAnnotation = (text: string, annotation: string): boolean =>
  new RegExp(`@${annotation}\\b`).test(text);

/** The 1-based line a character offset falls on. */
export const lineAt = (source: string, offset: number): number =>
  source.slice(0, offset).split('\n').length;

/**
 * The enum constants declared in a Java enum body, in declaration order.
 *
 * <p>Handles the two shapes this codebase uses: bare constants (`LOCAL,`) and constants
 * with arguments, including the ones that open a class body (`MEMORY_USED_BYTES(...) {`).
 */
export const enumConstants = (source: string): { name: string; args: string }[] => {
  const clean = withoutComments(source);
  const body = /\benum\s+\w+[^{]*\{([\s\S]*)/.exec(clean)?.[1];
  if (!body) return [];

  const found: { name: string; args: string }[] = [];
  let depth = 0;
  let index = 0;
  let atConstantPosition = true;

  while (index < body.length) {
    const character = body[index]!;
    if (depth === 0 && atConstantPosition) {
      const match = /^([A-Z][A-Z0-9_]*)\s*(\(([^()]*(?:\([^()]*\)[^()]*)*)\))?/.exec(
        body.slice(index),
      );
      if (match) {
        found.push({ name: match[1]!, args: match[3] ?? '' });
        index += match[0].length;
        atConstantPosition = false;
        continue;
      }
      // The first thing that is not a constant ends the constant list: a field, a
      // method, or the closing brace.
      if (/[A-Za-z}]/.test(character)) break;
    }
    if (character === '{' || character === '(') depth += 1;
    else if (character === '}' || character === ')') depth -= 1;
    else if (character === ',' && depth === 0) atConstantPosition = true;
    else if (character === ';' && depth === 0) break;
    index += 1;
  }
  return found;
};

/**
 * The Javadoc immediately preceding an offset, unwrapped into one sentence of plain text.
 *
 * <p>Found by walking backwards rather than by one regular expression over everything
 * before the offset: a lazy match anchored at the end still starts at the first `/**` in
 * the file, which is how every member ended up described by its class's own Javadoc.
 */
export const javadocBefore = (source: string, offset: number): string | undefined => {
  const before = source.slice(0, offset);
  // Only whitespace and further annotations may sit between the comment and the member.
  const gap = /(?:\s|@\w+(?:\([^)]*\))?)*$/.exec(before)?.[0] ?? '';
  const end = before.length - gap.length;
  if (!before.slice(0, end).endsWith('*/')) return undefined;
  const openedAt = before.lastIndexOf('/**', end);
  if (openedAt < 0) return undefined;

  const body = before
    .slice(openedAt + 3, end - 2)
    .split('\n')
    .map((line) => line.replace(/^\s*\*/, '').trim())
    .join(' ')
    .replace(/\{@\w+\s+#?([^}]+)\}/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!body) return undefined;
  return /^(.*?[.!?])(\s|$)/.exec(body)?.[1] ?? body;
};

/** The `summary = "..."` of a Swagger `@Operation`, which is prose written for readers. */
export const operationSummary = (text: string): string | undefined =>
  /@Operation\s*\((?:[^)]*?)summary\s*=\s*"((?:[^"\\]|\\.)*)"/.exec(text)?.[1];

/**
 * The annotation block a member carries, as one string.
 *
 * <p>Line based, because annotations here wrap across lines and nest parentheses — an
 * `@Operation` with a concatenated description spans five. The block is every contiguous
 * annotation line around `anchorLine`, expanded up and down until the parentheses balance
 * and the neighbouring line no longer starts one.
 */
export const annotationBlock = (lines: string[], anchorLine: number): string => {
  const balanced = (text: string) => {
    let depth = 0;
    for (const character of text) {
      if (character === '(') depth += 1;
      else if (character === ')') depth -= 1;
    }
    return depth === 0;
  };

  let first = anchorLine;
  while (first > 0) {
    const previous = lines[first - 1]!.trim();
    if (previous.startsWith('@') && balanced(lines.slice(first - 1, anchorLine + 1).join('\n'))) {
      first -= 1;
      continue;
    }
    // A wrapped annotation leaves the block above unbalanced; keep walking through it.
    if (previous !== '' && !balanced(lines.slice(first - 1, anchorLine + 1).join('\n'))) {
      first -= 1;
      continue;
    }
    break;
  }

  let last = anchorLine;
  while (last + 1 < lines.length) {
    const block = lines.slice(first, last + 1).join('\n');
    const next = lines[last + 1]!.trim();
    if (!balanced(block) || next.startsWith('@')) {
      last += 1;
      continue;
    }
    break;
  }
  return lines.slice(first, last + 1).join('\n');
};

/** Every `Permission.X` named by a `@RequiresPermission`, as the enum constant name. */
export const requiredPermission = (block: string): string | undefined =>
  /@RequiresPermission\s*\([^)]*?Permission\.(\w+)/s.exec(block)?.[1];

/** Every `Roles.X` named by a `@RolesAllowed`. */
export const allowedRoles = (block: string): string[] => {
  const clause = /@RolesAllowed\s*\(([\s\S]*?)\)/.exec(block)?.[1];
  if (!clause) return [];
  return [...clause.matchAll(/Roles\.(\w+)/g)].map((m) => m[1]!);
};

/** A Java string literal, including one written as several concatenated pieces. */
export const namedStringArgument = (block: string, annotation: string, argument: string): string | undefined => {
  const call = new RegExp(`@${annotation}\\s*\\(([\\s\\S]*?)\\)\\s*(?:\\n\\s*@|\\n\\s*[\\w<])`).exec(block)?.[1];
  const body = call ?? new RegExp(`@${annotation}\\s*\\(([\\s\\S]*)`).exec(block)?.[1];
  if (body === undefined) return undefined;
  const at = body.indexOf(`${argument}`);
  if (at < 0) return undefined;
  const pieces = [...body.slice(at).matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]!);
  if (pieces.length === 0) return undefined;
  // Only the run of literals joined by `+` belongs to this argument; the next argument
  // starts at the first comma that is not inside a literal, which a `+` never crosses.
  const upToNextArgument = body.slice(at).split(/,\s*\w+\s*=/)[0]!;
  const mine = [...upToNextArgument.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]!);
  return (mine.length ? mine : pieces).join('').replace(/\\"/g, '"').trim();
};
