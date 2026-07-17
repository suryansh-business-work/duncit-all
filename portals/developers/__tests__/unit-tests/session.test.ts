import { describe, expect, it } from 'vitest';
import * as session from '../../src/lib/session';

describe('portal session helpers', () => {
  it('builds the token + role-gate helpers from the shared shell factory', () => {
    expect(typeof session.getToken).toBe('function');
    expect(typeof session.setToken).toBe('function');
    expect(typeof session.clearToken).toBe('function');
    expect(typeof session.hasAppAccess).toBe('function');
    expect(typeof session.accessDeniedMessage).toBe('function');
  });

  it('round-trips a token under the developers_token key', () => {
    session.setToken('abc123');
    expect(session.getToken()).toBe('abc123');
    expect(localStorage.getItem('developers_token')).toBe('abc123');
    session.clearToken();
    expect(session.getToken()).toBeNull();
  });
});
