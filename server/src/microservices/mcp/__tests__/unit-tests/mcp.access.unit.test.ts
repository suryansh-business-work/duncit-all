import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { isMcpManager, requireMcpManager, requireMcpUser } from '../../mcp.access';
import { user } from './fixtures';

const ctx = (account: ReturnType<typeof user> | null) => ({ user: account }) as GraphQLContext;

function codeOf(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    if (error instanceof GraphQLError) return error.extensions.code;
    throw error;
  }
  return 'NO_ERROR';
}

describe('isMcpManager', () => {
  it('is true for MCP managers and super admins', () => {
    expect(isMcpManager(user(['MCP_MANAGER']))).toBe(true);
    expect(isMcpManager(user(['SUPER_ADMIN']))).toBe(true);
  });

  it('is false for an MCP user and for every other role', () => {
    expect(isMcpManager(user(['MCP_USER']))).toBe(false);
    expect(isMcpManager(user(['FINANCE_MANAGER', 'TECH_MANAGER']))).toBe(false);
    expect(isMcpManager(user([]))).toBe(false);
  });
});

describe('requireMcpUser', () => {
  it.each([['MCP_USER'], ['MCP_MANAGER'], ['SUPER_ADMIN']])('lets %s in and returns the account', (role) => {
    const account = user([role]);
    expect(requireMcpUser(ctx(account))).toBe(account);
  });

  it('asks a signed-out caller to sign in', () => {
    expect(codeOf(() => requireMcpUser(ctx(null)))).toBe('UNAUTHENTICATED');
  });

  it('refuses a signed-in account without an MCP role, with a reason', () => {
    expect(() => requireMcpUser(ctx(user(['FINANCE_MANAGER'])))).toThrow('Your account does not have MCP access');
    expect(codeOf(() => requireMcpUser(ctx(user(['FINANCE_MANAGER']))))).toBe('FORBIDDEN');
  });
});

describe('requireMcpManager', () => {
  it('lets an MCP manager and a super admin in', () => {
    const manager = user(['MCP_MANAGER']);
    expect(requireMcpManager(ctx(manager))).toBe(manager);
    expect(codeOf(() => requireMcpManager(ctx(user(['SUPER_ADMIN']))))).toBe('NO_ERROR');
  });

  it('refuses an MCP user', () => {
    expect(() => requireMcpManager(ctx(user(['MCP_USER'])))).toThrow('Access Denied');
    expect(codeOf(() => requireMcpManager(ctx(user(['MCP_USER']))))).toBe('FORBIDDEN');
  });

  it('asks a signed-out caller to sign in', () => {
    expect(codeOf(() => requireMcpManager(ctx(null)))).toBe('UNAUTHENTICATED');
  });
});
