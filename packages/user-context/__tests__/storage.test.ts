import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAllStorages, readCachedUser, writeCachedUser } from '../src/storage';

const KEY = 'test_user';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe('readCachedUser', () => {
  it('returns null when window is undefined', () => {
    vi.stubGlobal('window', undefined);
    expect(readCachedUser(KEY)).toBeNull();
  });

  it('returns null when nothing is cached', () => {
    expect(readCachedUser(KEY)).toBeNull();
  });

  it('parses and returns a cached object user', () => {
    localStorage.setItem(KEY, JSON.stringify({ user_id: '1', email: 'a@b.co' }));
    expect(readCachedUser(KEY)).toEqual({ user_id: '1', email: 'a@b.co' });
  });

  it('returns null when the parsed value is not an object', () => {
    localStorage.setItem(KEY, JSON.stringify('not-an-object'));
    expect(readCachedUser(KEY)).toBeNull();
  });

  it('drops corrupted JSON and returns null', () => {
    localStorage.setItem(KEY, '{not valid json');
    expect(readCachedUser(KEY)).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('swallows a removeItem failure while dropping corrupted JSON', () => {
    localStorage.setItem(KEY, '{broken');
    const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('nope');
    });
    expect(readCachedUser(KEY)).toBeNull();
    expect(spy).toHaveBeenCalled();
  });

  it('uses the default storage key when none is passed', () => {
    localStorage.setItem('duncit_user', JSON.stringify({ user_id: 'z' }));
    expect(readCachedUser()).toEqual({ user_id: 'z' });
  });
});

describe('writeCachedUser', () => {
  it('does nothing when window is undefined', () => {
    vi.stubGlobal('window', undefined);
    expect(() => writeCachedUser({ user_id: '1' }, KEY)).not.toThrow();
  });

  it('removes the key when the user is null', () => {
    localStorage.setItem(KEY, 'x');
    writeCachedUser(null, KEY);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('writes the serialized user', () => {
    writeCachedUser({ user_id: '2' }, KEY);
    expect(JSON.parse(localStorage.getItem(KEY) as string)).toEqual({ user_id: '2' });
  });

  it('swallows a setItem failure', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => writeCachedUser({ user_id: '3' }, KEY)).not.toThrow();
  });
});

describe('clearAllStorages', () => {
  it('does nothing when window is undefined', () => {
    vi.stubGlobal('window', undefined);
    expect(() => clearAllStorages()).not.toThrow();
  });

  it('clears both storages', () => {
    localStorage.setItem('a', '1');
    sessionStorage.setItem('b', '2');
    clearAllStorages();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('swallows a localStorage.clear failure', () => {
    vi.spyOn(Storage.prototype, 'clear').mockImplementationOnce(() => {
      throw new Error('boom');
    });
    expect(() => clearAllStorages()).not.toThrow();
  });

  it('swallows a sessionStorage.clear failure', () => {
    const clearSpy = vi.spyOn(Storage.prototype, 'clear');
    clearSpy.mockImplementationOnce(() => undefined); // localStorage ok
    clearSpy.mockImplementationOnce(() => {
      throw new Error('boom');
    }); // sessionStorage throws
    expect(() => clearAllStorages()).not.toThrow();
  });
});
