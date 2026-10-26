import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const m = vi.hoisted(() => ({ user: null as { roles: string[] } | null }));
vi.mock('@duncit/user-context', async (io) => ({
  ...(await io<typeof import('@duncit/user-context')>()),
  useUserData: () => ({ user: m.user }),
}));

import { isManagerRoles, useIsMcpManager } from '../../../src/lib/roles';

describe('isManagerRoles', () => {
  it('counts an MCP manager and a super admin as managers', () => {
    expect(isManagerRoles(['MCP_MANAGER'])).toBe(true);
    expect(isManagerRoles(['HOST', 'SUPER_ADMIN'])).toBe(true);
  });

  it('does not count an MCP user or any other role', () => {
    expect(isManagerRoles(['MCP_USER'])).toBe(false);
    expect(isManagerRoles(['FINANCE_MANAGER', 'HOST'])).toBe(false);
  });

  it('reads no roles at all as not a manager', () => {
    expect(isManagerRoles([])).toBe(false);
    expect(isManagerRoles(null)).toBe(false);
    expect(isManagerRoles(undefined)).toBe(false);
  });
});

describe('useIsMcpManager', () => {
  it('follows the signed-in person’s roles', () => {
    m.user = { roles: ['MCP_MANAGER'] };
    expect(renderHook(() => useIsMcpManager()).result.current).toBe(true);
    m.user = { roles: ['MCP_USER'] };
    expect(renderHook(() => useIsMcpManager()).result.current).toBe(false);
  });

  it('is false while nobody is signed in yet', () => {
    m.user = null;
    expect(renderHook(() => useIsMcpManager()).result.current).toBe(false);
  });
});
