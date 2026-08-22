/**
 * Every module in the app is imported once.
 *
 * A hundred-odd files here have never been loaded by any test — not because
 * they are untestable, but because nobody wrote a spec for that screen or that
 * hook yet. A module that cannot even be IMPORTED is broken for every screen
 * that will ever reach it, and in a bundled app that failure lands at runtime
 * on a device rather than at build time: Metro is happy to bundle a module
 * whose top level throws.
 *
 * This is the cheapest possible check of the widest possible surface. It says
 * nothing about behaviour — the 400-odd specs beside these files do that — only
 * that every gql document parses, every `styled()` call resolves, every
 * constant map builds, and no module reaches for something at import time that
 * is not there.
 *
 * Files are discovered from the filesystem rather than listed, so a screen
 * added tomorrow is covered tomorrow with nothing here to edit.
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * `navigation/linking.ts` reads the app's URI scheme at IMPORT time, and
 * expo-linking gets that from the expo-constants manifest — which does not
 * exist in a jest environment, only in a built app. Everything else here loads
 * for real; this is the one module that needs the platform stood in for.
 */
jest.mock('expo-linking', () => ({
  createURL: (path_: string) => `duncit://${path_}`,
  parse: () => ({ path: '', queryParams: {} }),
  useURL: () => null,
  addEventListener: () => ({ remove: () => undefined }),
  getInitialURL: async () => null,
}));

const SRC = path.join(__dirname, '..');

/** Compiled output, type-only files and the specs themselves are not modules
 * this is about — and `src/generated` is codegen, validated by the compiler. */
const SKIP = [
  `${path.sep}__tests__${path.sep}`,
  `${path.sep}__mocks__${path.sep}`,
  `${path.sep}generated${path.sep}`,
  `${path.sep}types${path.sep}`,
];

const isSource = (file: string) =>
  /\.tsx?$/.test(file) &&
  !file.endsWith('.d.ts') &&
  !/\.(test|spec)\.tsx?$/.test(file) &&
  !SKIP.some((fragment) => file.includes(fragment));

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (isSource(full)) out.push(full);
  }
  return out;
}

const modules = walk(SRC)
  .map((file) => path.relative(SRC, file).split(path.sep).join('/'))
  .sort((a, b) => a.localeCompare(b));

describe('every module loads', () => {
  it('found modules to load — an empty list would make the suite below vacuous', () => {
    expect(modules.length).toBeGreaterThan(100);
  });

  it.each(modules)('loads %s', (relative) => {
    expect(() => require(path.join(SRC, relative))).not.toThrow();
  });
});
