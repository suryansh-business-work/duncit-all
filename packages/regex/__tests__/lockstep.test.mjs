/**
 * regex.cjs, regex.mjs and regex.d.ts are three hand-maintained copies of the
 * same surface — every file says "keep in sync" and nothing enforced it, so a
 * pattern added to one and forgotten in another breaks Metro, Vite or tsc
 * depending on which consumer resolves which entry point. These tests are that
 * enforcement.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import * as esm from '../regex.mjs';

const cjs = createRequire(import.meta.url)('../regex.cjs');
const declarations = readFileSync(new URL('../regex.d.ts', import.meta.url), 'utf8');

/** Names the .d.ts declares, in either the const or the function form. */
function declaredNames(source) {
  const names = new Set();
  for (const [, name] of source.matchAll(/export const (\w+): RegExp;/g)) names.add(name);
  for (const [, name] of source.matchAll(/export function (\w+)\(/g)) names.add(name);
  return names;
}

const esmNames = new Set(Object.keys(esm));
const cjsNames = new Set(Object.keys(cjs));
const dtsNames = declaredNames(declarations);

const sorted = (set) => [...set].toSorted((a, b) => a.localeCompare(b));

describe('the three entry points expose the same surface', () => {
  it('regex.mjs and regex.cjs export identical names', () => {
    expect(sorted(esmNames)).toEqual(sorted(cjsNames));
  });

  it('regex.d.ts declares every runtime export, and nothing extra', () => {
    expect(sorted(dtsNames)).toEqual(sorted(esmNames));
  });

  it('exports something — a parser change that matched nothing would pass vacuously', () => {
    expect(esmNames.size).toBeGreaterThan(15);
  });
});

describe('the patterns themselves are identical across entry points', () => {
  const patternNames = sorted(esmNames).filter((name) => esm[name] instanceof RegExp);

  it('every RegExp export has the same source and flags in cjs and mjs', () => {
    const esmPatterns = patternNames.map((name) => `${name}=${esm[name].source}/${esm[name].flags}`);
    const cjsPatterns = patternNames.map((name) => `${name}=${cjs[name].source}/${cjs[name].flags}`);
    expect(esmPatterns).toEqual(cjsPatterns);
  });

  it('no pattern carries the global flag, so .test() is safe to reuse', () => {
    const globals = patternNames.filter((name) => esm[name].global);
    expect(globals).toEqual([]);
  });

  it('every validator agrees with its cjs twin on the same input', () => {
    // null and undefined are in here deliberately: toDigits guards its input
    // with a nullish guard, and with only string samples that guard never fired
    // on the cjs side, so the twin carried an unexercised branch.
    const samples = ['', '9876543210', 'a@b.com', '110001', '123456', 'HDFC0001234', 'john@okhdfcbank', '29ABCDE1234F1Z5', null, undefined];
    const validators = sorted(esmNames).filter((name) => typeof esm[name] === 'function');
    for (const name of validators) {
      for (const sample of samples) {
        expect(`${name}(${sample})=${esm[name](sample)}`).toBe(`${name}(${sample})=${cjs[name](sample)}`);
      }
    }
  });
});
