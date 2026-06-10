import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  accessDeniedMessage,
  clearToken,
  getToken,
  hasAppAccess,
  setToken,
  SUPER_ROLE,
} from '@/lib/session';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('session token helpers', () => {
  it('round-trips token via localStorage', () => {
    setToken('abc-123');
    expect(getToken()).toBe('abc-123');
    clearToken();
    expect(getToken()).toBeNull();
  });

  it('survives localStorage throwing on read', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(getToken()).toBeNull();
    spy.mockRestore();
  });

  it('survives localStorage throwing on clear', () => {
    const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => clearToken()).not.toThrow();
    spy.mockRestore();
  });
});

describe('hasAppAccess', () => {
  it('rejects empty / missing roles', () => {
    expect(hasAppAccess(undefined)).toBe(false);
    expect(hasAppAccess(null)).toBe(false);
    expect(hasAppAccess([])).toBe(false);
  });

  it('grants access when SUPER_ADMIN is present, regardless of app roles', () => {
    expect(hasAppAccess([SUPER_ROLE])).toBe(true);
  });

  it('grants access when one of the app-specific required roles is present', () => {
    // CRM's appConfig requiredRoles defaults to ['CRM_MANAGER'] — see app-config.ts.
    expect(hasAppAccess(['CRM_MANAGER'])).toBe(true);
  });

  it('denies access for unrelated roles', () => {
    expect(hasAppAccess(['POD_OWNER', 'GUEST'])).toBe(false);
  });
});

describe('accessDeniedMessage', () => {
  it('includes the app full name', () => {
    expect(accessDeniedMessage()).toMatch(/duncit crm/i);
  });
});
