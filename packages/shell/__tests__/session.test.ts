import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ emitAuthChanged: vi.fn() }));
vi.mock('@duncit/user-context', () => ({ emitAuthChanged: mocks.emitAuthChanged }));

import { createSession, SUPER_ROLE } from '../src/lib/session';

const KEY = 'test_token';

describe('createSession', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.emitAuthChanged.mockClear();
    vi.restoreAllMocks();
  });

  it('exposes the SUPER_ADMIN constant', () => {
    expect(SUPER_ROLE).toBe('SUPER_ADMIN');
  });

  it('reads and writes the token, emitting auth-changed on write', () => {
    const s = createSession(KEY, ['ADMIN']);
    expect(s.getToken()).toBeNull();
    s.setToken('abc');
    expect(localStorage.getItem(KEY)).toBe('abc');
    expect(s.getToken()).toBe('abc');
    expect(mocks.emitAuthChanged).toHaveBeenCalledTimes(1);
  });

  it('returns null from getToken when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(createSession(KEY).getToken()).toBeNull();
  });

  it('clears the token and emits, even when removal throws', () => {
    const s = createSession(KEY);
    s.setToken('abc');
    mocks.emitAuthChanged.mockClear();
    s.clearToken();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(mocks.emitAuthChanged).toHaveBeenCalledTimes(1);

    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    mocks.emitAuthChanged.mockClear();
    s.clearToken();
    expect(mocks.emitAuthChanged).toHaveBeenCalledTimes(1);
  });

  describe('hasAppAccess', () => {
    it('denies when roles are absent or empty', () => {
      const s = createSession(KEY, ['ADMIN']);
      expect(s.hasAppAccess(null)).toBe(false);
      expect(s.hasAppAccess([])).toBe(false);
    });

    it('always grants SUPER_ADMIN', () => {
      expect(createSession(KEY, ['ADMIN']).hasAppAccess([SUPER_ROLE])).toBe(true);
    });

    it('grants when a required role is present, denies otherwise', () => {
      const s = createSession(KEY, ['ADMIN', 'STAFF']);
      expect(s.hasAppAccess(['STAFF'])).toBe(true);
      expect(s.hasAppAccess(['GUEST'])).toBe(false);
    });
  });

  it('builds the access-denied message from the full name (default included)', () => {
    expect(createSession(KEY, [], 'Finance').accessDeniedMessage()).toContain('Finance');
    expect(createSession(KEY).accessDeniedMessage()).toContain('this console');
  });
});
