import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  accessDeniedMessage,
  clearToken,
  getToken,
  hasAppAccess,
  setToken,
} from './session';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('session token storage', () => {
  it('sets, reads and clears the token', () => {
    setToken('abc');
    expect(getToken()).toBe('abc');
    clearToken();
    expect(getToken()).toBeNull();
  });

  it('returns null when reading throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(getToken()).toBeNull();
  });

  it('swallows errors while clearing', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => clearToken()).not.toThrow();
  });
});

describe('hasAppAccess', () => {
  it('denies when there are no roles', () => {
    expect(hasAppAccess(null)).toBe(false);
    expect(hasAppAccess([])).toBe(false);
  });

  it('allows SUPER_ADMIN and the required role, denies others', () => {
    expect(hasAppAccess(['SUPER_ADMIN'])).toBe(true);
    expect(hasAppAccess(['EMPLOYEE'])).toBe(true);
    expect(hasAppAccess(['HOST'])).toBe(false);
  });
});

describe('accessDeniedMessage', () => {
  it('names the console', () => {
    expect(accessDeniedMessage()).toMatch(/duncit employee/i);
  });
});
