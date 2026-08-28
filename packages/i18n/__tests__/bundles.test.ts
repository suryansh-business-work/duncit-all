import { describe, expect, it } from 'vitest';
import {
  allFallbackEntries,
  flattenCatalogue,
  MWEB_BUNDLE,
  SHELL_BUNDLE,
  SURFACE_BUNDLES,
  WEBSITE_BUNDLE,
} from '../src';
import * as bundles from '../src/bundles';

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
  });

  // The registry is what the admin seeder reads, so a bundle written but never
  // registered ships keys no translator is ever offered.
  it('registers every bundle the package exports', () => {
    const registered = new Set(Object.values(SURFACE_BUNDLES));
    const unregistered = Object.entries(bundles)
      .filter(([name, value]) => name.endsWith('_BUNDLE') && !registered.has(value as never))
      .map(([name]) => name);

    expect(unregistered).toEqual([]);
    expect(Object.keys(SURFACE_BUNDLES)).toHaveLength(registered.size);
  });

  it('registers the three bundles the shared surfaces render from', () => {
    expect(SURFACE_BUNDLES.mweb).toBe(MWEB_BUNDLE);
    expect(SURFACE_BUNDLES.shell).toBe(SHELL_BUNDLE);
    expect(SURFACE_BUNDLES.website).toBe(WEBSITE_BUNDLE);
  });

  it('never ships one key with two different values', () => {
    // The server stores ONE row per key, so a key defined twice with different
    // copy is unrepresentable: whichever bundle merges last silently overwrites
    // the other surface's text once an admin imports the keys. Surface-specific
    // wording must therefore live under a surface-specific key.
    const seen = new Map<string, string>();
    const conflicts: string[] = [];
    for (const [surface, bundle] of Object.entries(SURFACE_BUNDLES)) {
      for (const [key, value] of Object.entries(flattenCatalogue(bundle))) {
        const prior = seen.get(key);
        if (prior !== undefined && prior !== value) conflicts.push(`${key} (${surface})`);
        else seen.set(key, value);
      }
    }
    expect(conflicts).toEqual([]);
  });

  it('shares a key across surfaces only when the copy is identical', () => {
    const app = flattenCatalogue(MWEB_BUNDLE);
    const shell = flattenCatalogue(SHELL_BUNDLE);
    // Deliberately shared — same word, same meaning on both surfaces.
    expect(app['mweb.common.language']).toBe(shell['mweb.common.language']);
    // The portal's hint reads differently, so it gets its OWN key.
    expect(shell['shell.profile.languageHint']).toBeDefined();
    expect(shell['mweb.common.languageHint']).toBeUndefined();
  });

  it('keeps website copy under its own namespace', () => {
    const website = Object.keys(flattenCatalogue(WEBSITE_BUNDLE));
    expect(website.every((key) => key.startsWith('website.'))).toBe(true);
  });
});
