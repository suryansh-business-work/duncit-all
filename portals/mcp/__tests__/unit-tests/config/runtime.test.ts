import { describe, expect, it } from 'vitest';
import { runtime } from '../../../src/runtime';

describe('MCP runtime', () => {
  it('reads the session from this console’s own token key', () => {
    expect(runtime.session.getToken()).toBeNull();
    localStorage.setItem('mcp_token', 'tok-1');
    expect(runtime.session.getToken()).toBe('tok-1');
    runtime.session.clearToken();
    expect(localStorage.getItem('mcp_token')).toBeNull();
  });

  it('lets in an MCP role or a super admin, and no one else', () => {
    expect(runtime.session.hasAppAccess(['MCP_USER'])).toBe(true);
    expect(runtime.session.hasAppAccess(['MCP_MANAGER'])).toBe(true);
    expect(runtime.session.hasAppAccess(['SUPER_ADMIN'])).toBe(true);
    expect(runtime.session.hasAppAccess(['HOST', 'FINANCE_MANAGER'])).toBe(false);
    expect(runtime.session.hasAppAccess([])).toBe(false);
  });

  it('hands the shell an Apollo client and a login page', () => {
    expect(typeof runtime.apolloClient.query).toBe('function');
    expect(typeof runtime.LoginPage).toBe('function');
    expect(typeof runtime.AppShell).toBe('function');
  });
});
