import { afterEach, describe, expect, it } from 'vitest';
import { appConfig } from '../config/app-config';
import { SUPER_ROLE, clearToken, getToken, hasAppAccess, setToken } from './session';

afterEach(() => clearToken());

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
  it('grants access to the configured AI_MANAGER role', () => {
    expect(hasAppAccess(['AI_MANAGER'])).toBe(true);
  });

  it('always grants access to ' + SUPER_ROLE, () => {
    expect(hasAppAccess([SUPER_ROLE])).toBe(true);
  });

  it('denies users without a required role', () => {
    expect(hasAppAccess(['SOME_OTHER_ROLE'])).toBe(false);
    expect(hasAppAccess([])).toBe(false);
    expect(hasAppAccess(null)).toBe(false);
  });

  it('uses AI_MANAGER as the default required role', () => {
    expect(appConfig.requiredRoles).toContain('AI_MANAGER');
  });
});
