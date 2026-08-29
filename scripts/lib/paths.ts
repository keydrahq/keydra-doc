import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** This file's directory, which is `<docs>/scripts/lib`. */
const here = dirname(fileURLToPath(import.meta.url));

/** The documentation platform's own root — where site.yml lives. */
export const docsRoot = resolve(here, '..', '..');

/**
 * The Keydra source tree.
 *
 * <p>The documentation is its own repository, so the application it documents is not
 * necessarily the parent directory. In order of preference: `--source <path>`, then
 * `KEYDRA_SOURCE`, then the parent — which is what a developer with all three checked out
 * side by side already has, and what CI arranges.
 *
 * <p>What is looked for under it is `keydra-backend/` and `keydra-frontend/`, named after
 * the repositories rather than after their role. That is the umbrella repository's layout,
 * and a second set of names here would mean the same tree had two.
 *
 * <p>Not optional. Every reference table in this documentation is read from here, and a
 * build that cannot find it would silently publish empty tables.
 */
const sourceFromArgv = (): string | undefined => {
  const at = process.argv.indexOf('--source');
  return at >= 0 ? process.argv[at + 1] : undefined;
};

export const repoRoot = resolve(
  docsRoot,
  sourceFromArgv() ?? process.env.KEYDRA_SOURCE ?? '..',
);

/**
 * Fail early and legibly when the source tree is missing, rather than at the first
 * `readFileSync` a hundred lines into the inventory.
 */
export const requireSource = (): void => {
  if (existsSync(join(repoRoot, 'keydra-backend', 'src')) && existsSync(join(repoRoot, 'keydra-frontend', 'locales'))) {
    return;
  }
  throw new Error(
    [
      '',
      `  The Keydra source tree was not found at ${repoRoot}`,
      '',
      '  This documentation is generated from it: the configuration tables, the',
      '  permission list, the endpoint reference and every interface label quoted in a',
      '  procedure are read out of keydra-backend/ and keydra-frontend/.',
      '',
      '  Those are the directory names, not a description: each is named after the',
      '  repository it is a checkout of, which is how the umbrella repository lays its',
      '  submodules out. Check them out beside this one, or point at their parent:',
      '',
      '    KEYDRA_SOURCE=/path/to/keydra make docs',
      '    yarn build --source /path/to/keydra',
      '',
    ].join('\n'),
  );
};

export const backendRoot = resolve(repoRoot, 'keydra-backend');
export const frontendRoot = resolve(repoRoot, 'keydra-frontend');

/** Where the derived inventory is written. Git-ignored: it is regenerated, never reviewed. */
export const generatedRoot = resolve(docsRoot, '.generated');

export const contentRoot = resolve(docsRoot, 'content');
export const distRoot = resolve(docsRoot, 'dist');
export const cacheRoot = resolve(docsRoot, '.cache');

/**
 * Turn an absolute path into one relative to the repository root.
 *
 * <p>Every path that reaches a generated file goes through this. An absolute path from
 * the machine that ran the build is somebody's home directory, and it must not travel
 * into an artefact that gets published.
 */
export const repoRelative = (absolute: string): string =>
  absolute.startsWith(repoRoot) ? absolute.slice(repoRoot.length + 1) : absolute;
