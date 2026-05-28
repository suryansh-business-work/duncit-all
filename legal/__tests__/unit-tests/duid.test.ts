import { afterEach, describe, expect, it, vi } from 'vitest';
import { getOrCreateDuid } from '../../src/duid';

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('getOrCreateDuid', () => {
  it('creates a stable id and persists it across calls', () => {
    const first = getOrCreateDuid();
    expect(first).toBeTruthy();
    expect(localStorage.getItem('duncit_duid')).toBe(first);
    expect(getOrCreateDuid()).toBe(first);
  });

  it('uses the timestamp+random fallback when crypto.randomUUID is unavailable', () => {
    localStorage.clear();
    vi.stubGlobal('crypto', {});
    const id = getOrCreateDuid();
    expect(id).toMatch(/^duid-/);
  });

  it('still returns an id when localStorage throws (private mode)', () => {
    const throwingStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => undefined,
    };
    vi.stubGlobal('localStorage', throwingStorage);
    expect(getOrCreateDuid()).toBeTruthy();
  });

  it('returns an empty string when there is no window (SSR guard)', () => {
    vi.stubGlobal('window', undefined);
    expect(getOrCreateDuid()).toBe('');
  });
});
