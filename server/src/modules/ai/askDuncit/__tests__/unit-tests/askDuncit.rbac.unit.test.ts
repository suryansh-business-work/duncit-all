/**
 * The assistant role and the capability set are what stand between a model
 * and a person's data — the model never decides either. These pin the rules:
 * a role is only ever one the account holds, an asked-for role it does not
 * hold is flagged, and a tool is reachable only when every layer agrees.
 */
import type { McpTool } from '@microservices/mcp/tools/tool.types';
import { approvalRequired, isEngineExcluded, policyAllows } from '../../rbac/askDuncit.capabilities';
import { heldRoleKeys, resolveRoleKey } from '../../rbac/askDuncit.role';
import { defaultRolePolicy } from '../../settings/askDuncitSettings.defaults';

function tool(overrides: Partial<McpTool> & { field?: string }): McpTool {
  return {
    source: 'graphql',
    name: 'pods_my_pods',
    title: 'My pods',
    description: '[Pods · Read-only] Your pods.',
    category: 'pods',
    kind: 'QUERY',
    risk: 'READ',
    confirm: false,
    outward: false,
    inputSchema: { type: 'object', properties: {} },
    field: 'myPods',
    module: 'podTypeDefs',
    document: { kind: 'Document', definitions: [] },
    operationName: 'McpMyPods',
    argNames: [],
    ...overrides,
  } as McpTool;
}

describe('heldRoleKeys', () => {
  it('gives every signed-in account the member role, and nothing else for a plain user', () => {
    expect(heldRoleKeys(['USER'])).toEqual(['MEMBER']);
  });

  it('maps account roles to assistant roles, most specific first', () => {
    expect(heldRoleKeys(['USER', 'HOST', 'VENUE_OWNER'])).toEqual(['VENUE_OWNER', 'HOST', 'MEMBER']);
  });

  it('treats a console seat as staff, and a super admin as super admin only', () => {
    expect(heldRoleKeys(['USER', 'SUPPORT_USER'])).toEqual(['STAFF', 'MEMBER']);
    expect(heldRoleKeys(['SUPER_ADMIN'])).toEqual(['SUPER_ADMIN', 'MEMBER']);
  });

  it('maps a partner-brand seller (ECOMM_MANAGER) to ECOMM_BRAND, not to the pet store', () => {
    expect(heldRoleKeys(['ECOMM_MANAGER'])).toContain('ECOMM_BRAND');
    expect(heldRoleKeys(['ECOMM_STORE_MANAGER'])).toEqual(['STAFF', 'MEMBER']);
  });
});

describe('resolveRoleKey', () => {
  it('honours a studio mode the account holds', () => {
    expect(resolveRoleKey(['USER', 'HOST'], 'HOST')).toMatchObject({ role: 'HOST', escalation: false });
    expect(resolveRoleKey(['USER', 'VENUE_OWNER'], 'VENUE')).toMatchObject({ role: 'VENUE_OWNER', escalation: false });
  });

  it('falls back to the most specific held role and flags an escalation for a role not held', () => {
    expect(resolveRoleKey(['USER'], 'SUPER_ADMIN')).toMatchObject({ role: 'MEMBER', escalation: true, requested: 'SUPER_ADMIN' });
  });

  it('does not flag an unknown value or no request at all', () => {
    expect(resolveRoleKey(['USER'], 'banana')).toMatchObject({ role: 'MEMBER', escalation: false });
    expect(resolveRoleKey(['USER', 'HOST'], null)).toMatchObject({ role: 'HOST', escalation: false });
  });
});

describe('isEngineExcluded', () => {
  it('never lets the assistant call its own API, curated meta tools or Duncit Lite', () => {
    expect(isEngineExcluded(tool({ field: 'sendAskDuncitMessage', name: 'ai_send_ask_duncit_message' }))).toBe(true);
    expect(isEngineExcluded(tool({ field: 'askDuncitSettings' }))).toBe(true);
    expect(isEngineExcluded(tool({ category: 'lite' }))).toBe(true);
    expect(isEngineExcluded({ ...tool({}), source: 'curated' } as unknown as McpTool)).toBe(true);
  });

  it('keeps an ordinary API tool', () => {
    expect(isEngineExcluded(tool({}))).toBe(false);
  });
});

describe('policyAllows', () => {
  const member = defaultRolePolicy('MEMBER');

  it('allows a read tool in one of the role’s categories', () => {
    expect(policyAllows(tool({}), member, true)).toBe(true);
  });

  it('refuses a category the role does not have', () => {
    expect(policyAllows(tool({ category: 'finance', name: 'finance_payouts' }), member, true)).toBe(false);
  });

  it('refuses every write when the role is read-only, and a blocked tool always', () => {
    const write = tool({ risk: 'WRITE', kind: 'MUTATION', name: 'pods_follow_pod' });
    expect(policyAllows(write, member, false)).toBe(false);
    expect(policyAllows(tool({}), { ...member, blocked_tools: ['pods_my_pods'] }, true)).toBe(false);
  });

  it('lets an explicitly allowed tool through outside the categories', () => {
    const finance = tool({ category: 'finance', name: 'finance_my_wallet' });
    expect(policyAllows(finance, { ...member, allowed_tools: ['finance_my_wallet'] }, true)).toBe(true);
  });

  it('lets a member reach their own reads that a console category files (wallet under Finance)', () => {
    const wallet = tool({ category: 'finance', alsoIn: ['account'], name: 'finance_my_wallet' });
    expect(policyAllows(wallet, member, true)).toBe(true);
    expect(policyAllows(wallet, { ...member, allowed_categories: ['pods'] }, true)).toBe(false);
  });

  it('opens every category to a wildcard role (the MCP console gate still applies per person)', () => {
    expect(policyAllows(tool({ category: 'finance' }), defaultRolePolicy('STAFF'), true)).toBe(true);
  });
});

describe('approvalRequired', () => {
  const relaxed = { ...defaultRolePolicy('MEMBER'), approve_all_writes: false };

  it('never asks for a read', () => {
    expect(approvalRequired(tool({}), defaultRolePolicy('MEMBER'))).toBe(false);
  });

  it('always asks for destructive, confirm-gated or outward tools, even when writes are relaxed', () => {
    expect(approvalRequired(tool({ risk: 'DESTRUCTIVE' }), relaxed)).toBe(true);
    expect(approvalRequired(tool({ risk: 'WRITE', confirm: true }), relaxed)).toBe(true);
    expect(approvalRequired(tool({ risk: 'WRITE', outward: true }), relaxed)).toBe(true);
  });

  it('asks for a plain write when the role approves all writes or lists the tool', () => {
    const write = tool({ risk: 'WRITE', name: 'pods_follow_pod' });
    expect(approvalRequired(write, defaultRolePolicy('MEMBER'))).toBe(true);
    expect(approvalRequired(write, relaxed)).toBe(false);
    expect(approvalRequired(write, { ...relaxed, approval_tools: ['pods_follow_pod'] })).toBe(true);
  });
});
