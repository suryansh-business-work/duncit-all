import { afterEach, describe, expect, it, vi } from 'vitest';
import { appConfig } from '../config/app-config';
import {
  accessDeniedMessage,
  clearToken,
  getToken,
  hasAppAccess,
  setToken,
  SUPER_ROLE,
} from './session';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('token storage', () => {
  it('sets, reads and clears the token', () => {
    setToken('jwt-123');
    expect(getToken()).toBe('jwt-123');
    expect(localStorage.getItem(appConfig.tokenKey)).toBe('jwt-123');
    clearToken();
    expect(getToken()).toBeNull();
  });

  it('returns null when reading storage throws', () => {
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
  it('denies empty role sets', () => {
    expect(hasAppAccess(null)).toBe(false);
    expect(hasAppAccess([])).toBe(false);
  });

  it('grants super admins unconditionally', () => {
    expect(hasAppAccess([SUPER_ROLE])).toBe(true);
  });

  it('grants when a required role is present and denies otherwise', () => {
    expect(hasAppAccess(appConfig.requiredRoles)).toBe(true);
    expect(hasAppAccess(['SOME_OTHER_ROLE'])).toBe(false);
  });
});

describe('accessDeniedMessage', () => {
  it('names the current app', () => {
    expect(accessDeniedMessage()).toContain(appConfig.fullName);
  });
});
