import { afterEach, describe, expect, it } from 'vitest';
import { appConfig } from '../../src/config/app-config';
import {
  SUPER_ROLE,
  accessDeniedMessage,
  clearToken,
  getToken,
  hasAppAccess,
  setToken,
} from '../../src/lib/session';

afterEach(() => {
  clearToken();
});

describe('session token storage', () => {
  it('round-trips and clears the auth token through the employee token key', () => {
    expect(getToken()).toBeNull();
    setToken('tok-1');
    expect(getToken()).toBe('tok-1');
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe('hasAppAccess', () => {
  it('grants access to the configured EMPLOYEE role', () => {
    expect(hasAppAccess(['EMPLOYEE'])).toBe(true);
  });

  it('always grants access to ' + SUPER_ROLE, () => {
    expect(SUPER_ROLE).toBe('SUPER_ADMIN');
    expect(hasAppAccess([SUPER_ROLE])).toBe(true);
  });

  it('denies users without a required role', () => {
    expect(hasAppAccess(['OTHER'])).toBe(false);
    expect(hasAppAccess([])).toBe(false);
    expect(hasAppAccess(null)).toBe(false);
    expect(hasAppAccess(undefined)).toBe(false);
  });
});

describe('accessDeniedMessage', () => {
  it('names the app in the denial message', () => {
    expect(accessDeniedMessage()).toContain(appConfig.fullName);
  });
});
