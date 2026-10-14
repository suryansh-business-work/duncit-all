import { describe, it, expect } from 'vitest';
import { LEGACY_POD_TYPES, isFreePodType, normalizePodType } from '../../src/pod-type';

describe('isFreePodType', () => {
  it('reads FREE and both legacy free names as free', () => {
    expect(isFreePodType('FREE')).toBe(true);
    expect(isFreePodType('NATIVE_FREE')).toBe(true);
    expect(isFreePodType('NON_NATIVE_FREE')).toBe(true);
  });

  it('reads PAID, every legacy paid name and a missing type as not free', () => {
    expect(isFreePodType('PAID')).toBe(false);
    expect(isFreePodType('NATIVE_PAID_PREMIUM')).toBe(false);
    expect(isFreePodType(null)).toBe(false);
    expect(isFreePodType(undefined)).toBe(false);
  });
});

describe('normalizePodType', () => {
  // Mirrors the server's LEGACY_POD_TYPE_MAP: the GraphQL PodType enum is
  // exactly FREE | PAID, so nothing else may be submitted.
  it('collapses every legacy name onto the FREE / PAID value that replaced it', () => {
    expect(LEGACY_POD_TYPES.map((type) => [type, normalizePodType(type)])).toEqual([
      ['NATIVE_FREE', 'FREE'],
      ['NATIVE_PAID', 'PAID'],
      ['NATIVE_PAID_PREMIUM', 'PAID'],
      ['NON_NATIVE_FREE', 'FREE'],
      ['NON_NATIVE_PAID', 'PAID'],
    ]);
  });

  it('leaves the two writable values as they are, and treats a missing type as paid', () => {
    expect(normalizePodType('FREE')).toBe('FREE');
    expect(normalizePodType('PAID')).toBe('PAID');
    expect(normalizePodType(undefined)).toBe('PAID');
  });
});
