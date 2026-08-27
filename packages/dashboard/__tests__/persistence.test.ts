/**
 * The localStorage mirror of a saved layout — what the grid paints against on
 * the first frame. Every read must survive a missing, foreign or corrupt entry:
 * a bad mirror falls back to the server, never to a crash before the page.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearCachedLayout, readCachedLayout, writeCachedLayout } from '../src/persistence';
import type { DashboardLayoutItem } from '../src/types';

const KEY = 'duncit.dashboard.layout.admin.overview';

const items: DashboardLayoutItem[] = [
  { id: 'pods', x: 0, y: 0, w: 6, h: 2 },
  { id: 'revenue', x: 6, y: 0, w: 6, h: 2 },
];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  globalThis.localStorage.clear();
});

describe('readCachedLayout', () => {
  it('is null when nothing was ever mirrored', () => {
    expect(readCachedLayout('admin.overview')).toBeNull();
  });

  it('round-trips what writeCachedLayout stored, under a key namespaced by dashboard', () => {
    writeCachedLayout('admin.overview', items);

    expect(JSON.parse(globalThis.localStorage.getItem(KEY) ?? 'null')).toEqual(items);
    expect(readCachedLayout('admin.overview')).toEqual(items);
    expect(readCachedLayout('finance.startup')).toBeNull();
  });

  it('is null for an entry that is not JSON', () => {
    globalThis.localStorage.setItem(KEY, '{not json');

    expect(readCachedLayout('admin.overview')).toBeNull();
  });

  it('is null for JSON that is not an array', () => {
    globalThis.localStorage.setItem(KEY, JSON.stringify({ id: 'pods', x: 0, y: 0, w: 6, h: 2 }));

    expect(readCachedLayout('admin.overview')).toBeNull();
  });

  it('keeps only the entries shaped like a slot, and is null once none are', () => {
    globalThis.localStorage.setItem(
      KEY,
      JSON.stringify([items[0], null, 'pods', { id: 'x', x: '0', y: 0, w: 6, h: 2 }, { id: 4, x: 0, y: 0, w: 6, h: 2 }])
    );
    expect(readCachedLayout('admin.overview')).toEqual([items[0]]);

    globalThis.localStorage.setItem(KEY, JSON.stringify([null, { id: 'pods' }]));
    expect(readCachedLayout('admin.overview')).toBeNull();
  });

  it('is null where there is no localStorage at all', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(readCachedLayout('admin.overview')).toBeNull();
  });
});

describe('writeCachedLayout / clearCachedLayout', () => {
  it('removes the mirror so the next mount falls back to the server', () => {
    writeCachedLayout('admin.overview', items);
    clearCachedLayout('admin.overview');

    expect(globalThis.localStorage.getItem(KEY)).toBeNull();
    expect(readCachedLayout('admin.overview')).toBeNull();
  });

  it('swallows a storage that refuses writes (private mode, quota)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => writeCachedLayout('admin.overview', items)).not.toThrow();
    expect(() => clearCachedLayout('admin.overview')).not.toThrow();
  });

  it('is a no-op where there is no localStorage at all', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(() => writeCachedLayout('admin.overview', items)).not.toThrow();
    expect(() => clearCachedLayout('admin.overview')).not.toThrow();
  });
});
