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
  it('persists and clears the auth token', () => {
    expect(getToken()).toBeNull();
    setToken('abc123');
    expect(getToken()).toBe('abc123');
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe('hasAppAccess', () => {
  it('grants access to the configured ADS_MANAGER role', () => {
    expect(hasAppAccess(['ADS_MANAGER'])).toBe(true);
  });

  it('always grants access to ' + SUPER_ROLE, () => {
    expect(hasAppAccess([SUPER_ROLE])).toBe(true);
  });

  it('denies users without a required role', () => {
    expect(hasAppAccess(['SOME_OTHER_ROLE'])).toBe(false);
    expect(hasAppAccess([])).toBe(false);
    expect(hasAppAccess(null)).toBe(false);
    expect(hasAppAccess(undefined)).toBe(false);
  });

  it('uses ADS_MANAGER as the default required role', () => {
    expect(appConfig.requiredRoles).toContain('ADS_MANAGER');
  });
});

describe('accessDeniedMessage', () => {
  it('names the app in the denial message', () => {
    expect(accessDeniedMessage()).toContain(appConfig.fullName);
  });
});
