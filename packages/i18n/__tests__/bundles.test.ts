import { describe, expect, it } from 'vitest';
import {
  allFallbackEntries,
  flattenCatalogue,
  MWEB_BUNDLE,
  SHELL_BUNDLE,
  SURFACE_BUNDLES,
  WEBSITE_BUNDLE,
} from '../src';

describe('shipped fallback bundles', () => {
  it('namespaces every key by surface, so admin filters work', () => {
    const badlyNamespaced = Object.keys(allFallbackEntries()).filter(
      (key) => !key.includes('.'),
    );
    expect(badlyNamespaced).toEqual([]);
  });

  it('ships non-empty copy for every key — a blank renders as nothing', () => {
    const blank = Object.entries(allFallbackEntries())
      .filter(([, value]) => value.trim() === '')
      .map(([key]) => key);
    expect(blank).toEqual([]);
  });

  it('covers every surface bundle in the merged registry', () => {
    const merged = allFallbackEntries();
    for (const bundle of Object.values(SURFACE_BUNDLES)) {
      for (const key of Object.keys(flattenCatalogue(bundle))) {
        expect(merged).toHaveProperty(key);
      }
    }
    expect(Object.keys(SURFACE_BUNDLES).sort((a, b) => a.localeCompare(b))).toEqual([
      'mweb',
      'shell',
      'website',
    ]);
  });

  it('keeps the shell from redefining app copy differently', () => {
    // Both surfaces render `mweb.common.*`; where a key exists in both it must
    // be the shell's portal-specific wording, never a silent contradiction of
    // shared text that mWeb and native rely on.
    const app = flattenCatalogue(MWEB_BUNDLE);
    const shell = flattenCatalogue(SHELL_BUNDLE);
    expect(app['mweb.common.language']).toBe(shell['mweb.common.language']);
    expect(app['mweb.common.languageHint']).not.toBe(shell['mweb.common.languageHint']);
  });

  it('keeps website copy under its own namespace', () => {
    const website = Object.keys(flattenCatalogue(WEBSITE_BUNDLE));
    expect(website.every((key) => key.startsWith('website.'))).toBe(true);
  });
});
