import { GATEWAY_ENDPOINT } from '../../mcp.constants';
import {
  canOpenEndpoint,
  isListedOn,
  listTools,
  reachableCategories,
  REFUSAL_MESSAGES,
  refusalFor,
  usableTools,
  type Viewer,
} from '../../catalog/visibility';
import { buildFixtureCatalog, FINANCE_STAFF, MEMBER, PODS_STAFF, READ_ONLY, READ_WRITE, settings, SUPER_ADMIN, toolNamed } from './fixtures';

const catalog = buildFixtureCatalog();
const tool = (name: string) => toolNamed(catalog, name);
const viewer = (over: Partial<Viewer> = {}): Viewer => ({ user: PODS_STAFF, scopes: READ_WRITE, settings: settings(), ...over });
const names = (tools: ReadonlyArray<{ name: string }>) => tools.map((t) => t.name);

const EVERYWHERE = ['mcp_whoami', 'mcp_list_tools', 'mcp_search_tools', 'mcp_describe_tool', 'mcp_audit_tools', 'mcp_my_usage', 'mcp_self_test'];

describe('isListedOn', () => {
  it('lists a curated "*" tool on every endpoint, the gateway included', () => {
    for (const endpoint of [GATEWAY_ENDPOINT, 'pods', 'finance', 'mcp']) expect(isListedOn(tool('mcp_whoami'), endpoint)).toBe(true);
  });

  it('lists mcp_call_tool on the gateway only', () => {
    expect(isListedOn(tool('mcp_call_tool'), GATEWAY_ENDPOINT)).toBe(true);
    expect(isListedOn(tool('mcp_call_tool'), 'pods')).toBe(false);
  });

  it('lists a curated tool on exactly the endpoints it names', () => {
    const audit = tool('pods_audit_timings');
    expect(['pods', 'admin', 'regional-club-admin', GATEWAY_ENDPOINT].every((key) => isListedOn(audit, key))).toBe(true);
    expect(isListedOn(audit, 'finance')).toBe(false);
    expect(isListedOn(audit, 'app')).toBe(false);
  });

  it('never lists an API tool on the gateway (it is reached through mcp_call_tool)', () => {
    expect(isListedOn(tool('pods_pods_table'), GATEWAY_ENDPOINT)).toBe(false);
  });

  it('lists an API tool on every endpoint serving its category and nowhere else', () => {
    expect(isListedOn(tool('pods_pods_table'), 'pods')).toBe(true);
    expect(isListedOn(tool('pods_pods_table'), 'app')).toBe(true);
    expect(isListedOn(tool('pods_pods_table'), 'finance')).toBe(false);
    expect(isListedOn(tool('pods_pods_table'), 'no-such-endpoint')).toBe(false);
  });
});

describe('reachableCategories', () => {
  it('is the union of the categories of every console the person can open', () => {
    expect([...reachableCategories(MEMBER)].sort()).toEqual(
      ['account', 'chat', 'clubs', 'engagement', 'gig-jobs', 'hosts', 'legal', 'lite', 'mcp', 'partner-brand', 'pods', 'support', 'venues'].sort()
    );
  });

  it('adds finance only for someone who opens the Finance console', () => {
    expect(reachableCategories(MEMBER).has('finance')).toBe(false);
    expect(reachableCategories(FINANCE_STAFF).has('finance')).toBe(true);
  });
});

describe('refusalFor', () => {
  it('lets a person use a tool their console has', () => {
    expect(refusalFor(tool('pods_create_pod'), viewer())).toBeNull();
  });

  it('refuses a tool switched off by name or by category', () => {
    expect(refusalFor(tool('pods_pod'), viewer({ settings: settings({ disabled_tools: ['pods_pod'] }) }))).toBe('DISABLED');
    expect(refusalFor(tool('pods_pod'), viewer({ settings: settings({ disabled_categories: ['pods'] }) }))).toBe('DISABLED');
  });

  it('refuses a writing tool on a read-only connection but still allows reads there', () => {
    expect(refusalFor(tool('pods_create_pod'), viewer({ scopes: READ_ONLY }))).toBe('READ_ONLY_CONNECTION');
    expect(refusalFor(tool('pods_pods_table'), viewer({ scopes: READ_ONLY }))).toBeNull();
  });

  it('refuses every writing tool while writes are switched off, destructive ones included', () => {
    const off = viewer({ settings: settings({ write_tools_enabled: false }) });
    expect(refusalFor(tool('pods_create_pod'), off)).toBe('WRITES_DISABLED');
    expect(refusalFor(tool('pods_delete_pod'), off)).toBe('WRITES_DISABLED');
    expect(refusalFor(tool('pods_pod'), off)).toBeNull();
  });

  it('refuses a tool in a category no console of theirs serves', () => {
    expect(refusalFor(tool('finance_payout_summary'), viewer({ user: MEMBER }))).toBe('NO_PORTAL_ACCESS');
    expect(refusalFor(tool('finance_payout_summary'), viewer({ user: FINANCE_STAFF }))).toBeNull();
  });

  it('reports the switch-off first, then the connection, then the settings, then access', () => {
    const everythingWrong = viewer({ user: MEMBER, scopes: READ_ONLY, settings: settings({ write_tools_enabled: false, disabled_tools: ['finance_refund_payment'] }) });
    expect(refusalFor(tool('finance_refund_payment'), everythingWrong)).toBe('DISABLED');
    expect(refusalFor(tool('finance_approve_payment_release'), everythingWrong)).toBe('READ_ONLY_CONNECTION');
    expect(refusalFor(tool('finance_approve_payment_release'), { ...everythingWrong, scopes: READ_WRITE })).toBe('WRITES_DISABLED');
  });

  it('has a person-readable message for every refusal', () => {
    for (const message of Object.values(REFUSAL_MESSAGES)) expect(message.length).toBeGreaterThan(20);
  });
});

describe('usableTools', () => {
  it('is everything a super admin can call, wherever it is served', () => {
    expect(usableTools(catalog, viewer({ user: SUPER_ADMIN }))).toHaveLength(catalog.tools.length);
  });

  it('drops the writing tools on a read-only connection', () => {
    const usable = usableTools(catalog, viewer({ user: SUPER_ADMIN, scopes: READ_ONLY }));
    expect(usable.every((t) => t.risk === 'READ')).toBe(true);
    expect(names(usable)).toContain('pods_pods_table');
  });
});

describe('canOpenEndpoint', () => {
  it('opens the gateway for everyone', () => {
    expect(canOpenEndpoint(GATEWAY_ENDPOINT, MEMBER)).toBe(true);
  });

  it('opens a console endpoint only with that console', () => {
    expect(canOpenEndpoint('pods', PODS_STAFF)).toBe(true);
    expect(canOpenEndpoint('pods', MEMBER)).toBe(false);
    expect(canOpenEndpoint('no-such-endpoint', SUPER_ADMIN)).toBe(false);
  });
});

describe('listTools', () => {
  it('offers only the curated tools on the gateway', () => {
    expect(names(listTools(catalog, GATEWAY_ENDPOINT, viewer({ user: MEMBER })))).toEqual([...EVERYWHERE.slice(0, 5), 'mcp_call_tool', ...EVERYWHERE.slice(5), 'pods_audit_timings']);
  });

  it('offers the pods console its own tools plus the curated ones listed there', () => {
    expect(names(listTools(catalog, 'pods', viewer()))).toEqual([
      ...EVERYWHERE,
      'pods_audit_timings',
      'pods_pods_table',
      'pods_pod',
      'pods_pod_count',
      'pods_create_pod',
      'pods_delete_pod',
      'pods_join_free_pod',
      'pods_send_pod_reminder',
    ]);
  });

  it('offers nothing on an endpoint the person cannot open', () => {
    expect(listTools(catalog, 'pods', viewer({ user: MEMBER }))).toEqual([]);
  });

  it('hides writing tools on a read-only connection', () => {
    expect(names(listTools(catalog, 'finance', viewer({ user: FINANCE_STAFF, scopes: READ_ONLY })))).toEqual([...EVERYWHERE, 'finance_payout_summary']);
  });

  it('hides a switched-off category, curated tools in it included', () => {
    const listed = names(listTools(catalog, 'pods', viewer({ settings: settings({ disabled_categories: ['pods'] }) })));
    expect(listed).toEqual(EVERYWHERE);
  });
});
