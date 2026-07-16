import { describe, expect, it } from 'vitest';

import {
  accessDeniedMessage,
  clearToken,
  getToken,
  hasAppAccess,
  setToken,
  SUPER_ROLE,
} from '../lib/session';

describe('lib/session', () => {
  it('exposes the shared session helpers built from appConfig', () => {
    expect(typeof getToken).toBe('function');
    expect(typeof setToken).toBe('function');
    expect(typeof clearToken).toBe('function');
    expect(typeof hasAppAccess).toBe('function');
    expect(typeof accessDeniedMessage).toBe('function');
  });

  it('re-exports SUPER_ROLE from the shell', () => {
    expect(SUPER_ROLE).toBe('SUPER_ADMIN');
  });

  it('round-trips the token through the employee token key', () => {
    setToken('tok-1');
    expect(getToken()).toBe('tok-1');
    clearToken();
    expect(getToken()).toBeNull();
  });

  it('grants access to the EMPLOYEE role and the super role, denies others', () => {
    expect(hasAppAccess(['EMPLOYEE'])).toBe(true);
    expect(hasAppAccess([SUPER_ROLE])).toBe(true);
    expect(hasAppAccess(['OTHER'])).toBe(false);
    expect(hasAppAccess([])).toBe(false);
    expect(accessDeniedMessage()).toContain('Duncit Employee');
  });
});
