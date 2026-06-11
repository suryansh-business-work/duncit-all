import { afterEach, describe, expect, it, vi } from 'vitest';
import { getToken, setToken, clearToken, hasAppAccess, accessDeniedMessage } from './session';
import { appConfig } from '../config/app-config';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('session token storage', () => {
  it('sets and gets the token', () => {
    setToken('abc');
    expect(localStorage.getItem(appConfig.tokenKey)).toBe('abc');
    expect(getToken()).toBe('abc');
  });

  it('clears the token', () => {
    setToken('abc');
    clearToken();
    expect(getToken()).toBeNull();
  });

  it('returns null when reading throws (storage unavailable)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(getToken()).toBeNull();
  });

  it('swallows errors when clearing throws', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => clearToken()).not.toThrow();
  });
});

describe('hasAppAccess', () => {
  it('denies missing/empty roles', () => {
    expect(hasAppAccess(null)).toBe(false);
    expect(hasAppAccess([])).toBe(false);
  });

  it('allows SUPER_ADMIN regardless of app role', () => {
    expect(hasAppAccess(['SUPER_ADMIN'])).toBe(true);
  });

  it('allows a required app role and denies others', () => {
    expect(hasAppAccess(appConfig.requiredRoles)).toBe(true);
    expect(hasAppAccess(['SOME_OTHER_ROLE'])).toBe(false);
  });

  it('builds an access-denied message naming the app', () => {
    expect(accessDeniedMessage()).toContain(appConfig.fullName);
  });
});
