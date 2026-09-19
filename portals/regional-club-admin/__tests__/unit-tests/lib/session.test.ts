import { afterEach, describe, expect, it, vi } from 'vitest';
import { appConfig } from '../../../src/config/app-config';
import {
  SUPER_ROLE,
  accessDeniedMessage,
  clearToken,
  getToken,
  hasAppAccess,
  setToken,
} from '../../../src/lib/session';

afterEach(() => {
  vi.unstubAllGlobals();
  clearToken();
});

describe('session token storage', () => {
  it('keeps the token under this console’s own key', () => {
    expect(getToken()).toBeNull();
    setToken('fixture-session');
    expect(localStorage.getItem(appConfig.tokenKey)).toBe('fixture-session');
    expect(getToken()).toBe('fixture-session');
    clearToken();
    expect(getToken()).toBeNull();
  });

  it('reads as signed out when the browser blocks storage', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
    });
    expect(getToken()).toBeNull();
  });
});

describe('hasAppAccess', () => {
  it('admits a Regional Club Admin and a super admin', () => {
    expect(hasAppAccess(['REGIONAL_CLUB_ADMIN'])).toBe(true);
    expect(hasAppAccess([SUPER_ROLE])).toBe(true);
  });

  it('turns away a plain Club Admin and a user with no roles', () => {
    expect(hasAppAccess(['CLUB_ADMIN'])).toBe(false);
    expect(hasAppAccess([])).toBe(false);
    expect(hasAppAccess(null)).toBe(false);
  });
});

describe('accessDeniedMessage', () => {
  it('names this console', () => {
    expect(accessDeniedMessage()).toContain('Duncit Regional Club Admin');
  });
});
