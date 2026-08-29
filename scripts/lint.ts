/**
 * Run Vale over the content.
 *
 *   tsx scripts/lint.ts [--install] [--json]
 *
 * <p>Vale is a Go binary rather than a dependency this project can pull from npm, so it is
 * downloaded into `.vale/bin` on first use and git-ignored from there. A machine with no
 * network says so and exits non-zero, rather than passing quietly — a lint that silently
 * does nothing is worse than one that is missing.
 */
import { chmodSync, cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { docsRoot } from './lib/paths.ts';

const VALE_VERSION = '3.14.0';
const binDir = join(docsRoot, '.vale', 'bin');
const vale = join(binDir, 'vale');

const platform = () => {
  const arch = process.arch === 'arm64' ? 'arm64' : '64-bit';
  if (process.platform === 'darwin') return `macOS_${arch}`;
  if (process.platform === 'win32') return `Windows_${arch}`;
  return `Linux_${arch}`;
};

/**
 * Vale's AsciiDoc package shells out to an `asciidoctor` on PATH, and this toolchain has
 * no Ruby. `scripts/vale-asciidoctor.mjs` is the same conversion through the dependency
 * that is already here; this puts it where Vale will find it.
 */
const shimDirectory = join(docsRoot, '.cache', 'bin');
const installShim = (): void => {
  mkdirSync(shimDirectory, { recursive: true });
  const shim = join(shimDirectory, 'asciidoctor');
  writeFileSync(
    shim,
    `#!/bin/sh\nexec "${process.execPath}" "${join(docsRoot, 'scripts', 'vale-asciidoctor.mjs')}" "$@"\n`,
  );
  chmodSync(shim, 0o755);
};

const run = (command: string, args: string[], options: { cwd?: string } = {}) =>
  spawnSync(command, args, {
    stdio: 'inherit',
    cwd: options.cwd ?? docsRoot,
    env: { ...process.env, PATH: `${shimDirectory}:${process.env.PATH ?? ''}` },
  });

const install = (): boolean => {
  mkdirSync(binDir, { recursive: true });
  const url =
    `https://github.com/errata-ai/vale/releases/download/v${VALE_VERSION}` +
    `/vale_${VALE_VERSION}_${platform()}.tar.gz`;
  console.log(`  downloading Vale ${VALE_VERSION}`);
  const fetched = spawnSync('sh', ['-c', `curl -sSfL "${url}" | tar -xz -C "${binDir}" vale`], {
    stdio: 'inherit',
  });
  if (fetched.status !== 0 || !existsSync(vale)) return false;
  chmodSync(vale, 0o755);
  return true;
};

if (!existsSync(vale) && !install()) {
  console.error('');
  console.error('  Vale could not be downloaded.');
  console.error('  Install it yourself (https://vale.sh) and put it on PATH, or in .vale/bin.');
  console.error('');
  process.exit(1);
}

// `vale sync` fetches the style packages named in .vale.ini. It needs the network once;
// after that the styles are on disk and linting is offline.
if (!existsSync(join(docsRoot, '.vale', 'styles', 'RedHat'))) {
  console.log('  fetching the style packages');
  if (run(vale, ['sync']).status !== 0) {
    console.error('');
    console.error('  The Vale style packages could not be fetched.');
    console.error('  Run `.vale/bin/vale sync` when the machine has a network.');
    console.error('');
    process.exit(1);
  }
}

installShim();

/**
 * The RedHat package ships its Tengo actions and dictionaries under its own directory,
 * and Vale resolves a rule's `script:` path against StylesPath rather than against the
 * package. Linking them up one level is what makes rules like NoGerundsInTitles load;
 * without it Vale stops with "script not found" before it has checked anything.
 */
const linkPackageAssets = (): void => {
  const styles = join(docsRoot, '.vale', 'styles');
  for (const directory of ['actions', 'dictionaries']) {
    const from = join(styles, 'RedHat', directory);
    const to = join(styles, directory);
    if (existsSync(from) && !existsSync(to)) cpSync(from, to, { recursive: true });
  }
};
linkPackageAssets();

const format = process.argv.includes('--json') ? ['--output=JSON'] : [];
// Everything is reported; only errors fail. A warning is information a writer should see,
// and a build that fails on one is a build people learn to ignore.
const gate = process.argv.includes('--strict') ? [] : ['--minAlertLevel=error'];
const result = run(vale, [...format, ...gate, 'content']);
process.exit(result.status ?? 1);
