import { describe, expect, it } from 'vitest';
import {
  flattenCatalogue,
  mergeCatalogues,
  missingKeys,
  nestCatalogue,
} from '../src/catalogue';

describe('flattenCatalogue', () => {
  it('flattens nested page-wise entries to dot-paths', () => {
    expect(
      flattenCatalogue({
        mweb: { shop: { title: 'Pod Shop', emptyState: 'Nothing here' } },
        common: { save: 'Save' },
      }),
    ).toEqual({
      'mweb.shop.title': 'Pod Shop',
      'mweb.shop.emptyState': 'Nothing here',
      'common.save': 'Save',
    });
  });

  it('drops non-string leaves instead of coercing them', () => {
    const flat = flattenCatalogue({
      ok: 'yes',
      // Values that would render as "[object Object]" or "42" are ignored.
      bad: 42 as never,
      alsoBad: null as never,
      nested: { list: ['a'] as never },
    });
    expect(flat).toEqual({ ok: 'yes' });
  });

  it('handles empty and absent input', () => {
    expect(flattenCatalogue({})).toEqual({});
    expect(flattenCatalogue(null)).toEqual({});
    expect(flattenCatalogue(undefined)).toEqual({});
  });
});

describe('nestCatalogue', () => {
  it('expands dot-paths back to nested form', () => {
    expect(nestCatalogue({ 'a.b.c': 'x', 'a.d': 'y', top: 'z' })).toEqual({
      a: { b: { c: 'x' }, d: 'y' },
      top: 'z',
    });
  });

  it('round-trips with flattenCatalogue', () => {
    const flat = { 'mweb.shop.title': 'Pod Shop', 'common.save': 'Save' };
    expect(flattenCatalogue(nestCatalogue(flat))).toEqual(flat);
  });

  it('replaces a leaf that blocks a deeper key rather than losing it', () => {
    expect(nestCatalogue({ a: 'leaf', 'a.b': 'deeper' })).toEqual({ a: { b: 'deeper' } });
  });

  it('ignores empty paths and absent input', () => {
    expect(nestCatalogue({ '': 'nope' })).toEqual({});
    expect(nestCatalogue(null)).toEqual({});
    expect(nestCatalogue(undefined)).toEqual({});
  });
});

describe('mergeCatalogues', () => {
  it('lets server values win over the local fallback', () => {
    expect(mergeCatalogues({ a: 'local', b: 'local' }, { a: 'server' })).toEqual({
      a: 'server',
      b: 'local',
    });
  });

  it('ignores blank server values so an empty admin field cannot blank the UI', () => {
    expect(mergeCatalogues({ a: 'local' }, { a: '   ' })).toEqual({ a: 'local' });
    expect(mergeCatalogues({ a: 'local' }, { a: '' })).toEqual({ a: 'local' });
  });

  it('handles either side being absent', () => {
    expect(mergeCatalogues(null, { a: 'server' })).toEqual({ a: 'server' });
    expect(mergeCatalogues({ a: 'local' }, null)).toEqual({ a: 'local' });
    expect(mergeCatalogues(null, null)).toEqual({});
  });
});

describe('missingKeys', () => {
  it('reports reference keys absent or blank in the candidate, sorted', () => {
    expect(
      missingKeys({ b: 'B', a: 'A', c: 'C', d: 'D' }, { a: 'A', c: '   ', d: '' }),
    ).toEqual(['b', 'c', 'd']);
  });

  it('returns nothing when the candidate is complete', () => {
    expect(missingKeys({ a: 'A' }, { a: 'translated' })).toEqual([]);
  });

  it('handles absent input on either side', () => {
    expect(missingKeys(null, null)).toEqual([]);
    expect(missingKeys({ a: 'A' }, null)).toEqual(['a']);
    expect(missingKeys(null, { a: 'A' })).toEqual([]);
  });
});
