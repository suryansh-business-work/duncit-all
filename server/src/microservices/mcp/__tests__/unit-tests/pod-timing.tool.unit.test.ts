import { GraphQLError, print, type DocumentNode } from 'graphql';
import { ToolInputError } from '../../execute/validate';
import { GATEWAY_ENDPOINT } from '../../mcp.constants';
import type { PodTimingRow, TimingIssue } from '../../tools/pods/pod-timing.audit';
import { podTimingAuditTool } from '../../tools/pods/pod-timing.tool';
import { toolContext, type FakeContext } from './fixtures';

const NOW = Date.parse('2026-10-26T10:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const MIN = 60_000;

const row = (id: string, startMin: number, endMin: number | null, over: Partial<PodTimingRow> = {}): PodTimingRow => ({
  id,
  pod_title: `Pod ${id}`,
  pod_date_time: new Date(NOW + startMin * MIN).toISOString(),
  pod_end_date_time: endMin === null ? null : new Date(NOW + endMin * MIN).toISOString(),
  venue_id: null,
  pod_hosts_id: [],
  pod_mode: 'PHYSICAL',
  is_deleted: false,
  completed_at: null,
  created_at: new Date(NOW - 10 * DAY).toISOString(),
  ...over,
});
const healthy = (count: number, prefix = 'p') => Array.from({ length: count }, (_, i) => row(`${prefix}${i}`, 60 * i, 60 * i + 30));
const page = (rows: PodTimingRow[], total: number) => ({ data: { podsTable: { rows, total } } });

interface Report {
  window: { from: string; to: string };
  pods_in_window: number;
  pods_checked: number;
  complete: boolean;
  errors: number;
  warnings: number;
  by_check: Record<string, number>;
  checks_run: string[];
  checks_skipped: string[];
  issues: TimingIssue[];
  issues_truncated: boolean;
}

let context: FakeContext;
const audit = async (args: Record<string, unknown> = {}) => (await podTimingAuditTool.run(context, args)) as Report;
const variables = (call = 0) => context.execute.mock.calls[call][1];

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  context = toolContext();
});
afterEach(() => jest.restoreAllMocks());

describe('pods_audit_timings — reading the pods', () => {
  it('is a read-only pods tool listed on the pods consoles and the gateway', () => {
    expect(podTimingAuditTool).toMatchObject({ category: 'pods', risk: 'READ', listedOn: [GATEWAY_ENDPOINT, 'pods', 'admin', 'regional-club-admin'] });
  });

  it('reads podsTable with only the timing fields, as the person', async () => {
    context.execute.mockResolvedValue(page([], 0));
    await audit();
    const document = context.execute.mock.calls[0][0] as DocumentNode;
    expect(print(document)).toContain('podsTable(query: $query, include_deleted: $include_deleted)');
    expect(print(document)).toMatch(/rows \{\s+id\s+pod_title\s+pod_date_time\s+pod_end_date_time\s+venue_id\s+pod_hosts_id\s+pod_mode\s+is_deleted\s+completed_at\s+created_at\s+\}/);
  });

  it('defaults the window to 30 days back and 60 days ahead', async () => {
    context.execute.mockResolvedValue(page([], 0));
    const report = await audit();
    expect(report.window).toEqual({ from: new Date(NOW - 30 * DAY).toISOString(), to: new Date(NOW + 60 * DAY).toISOString() });
    expect(variables()).toEqual({
      query: { page: 1, page_size: 100, filters: [{ field: 'pod_date_time', op: 'between', values: [report.window.from, report.window.to] }] },
      include_deleted: false,
    });
  });

  it('sends the club and venue filters and asks for cancelled pods only when told to', async () => {
    context.execute.mockResolvedValue(page([], 0));
    await audit({ from: '2026-10-01', to: '2026-11-01', club_id: 'club_1', venue_id: 'venue_9', include_cancelled: true });
    expect(variables()).toEqual({
      query: {
        page: 1,
        page_size: 100,
        filters: [
          { field: 'pod_date_time', op: 'between', values: ['2026-10-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z'] },
          { field: 'club_id', op: 'eq', value: 'club_1' },
          { field: 'venue_id', op: 'eq', value: 'venue_9' },
        ],
      },
      include_deleted: true,
    });
  });

  it('pages through the window until it has every pod', async () => {
    context.execute
      .mockResolvedValueOnce(page(healthy(100, 'a'), 250))
      .mockResolvedValueOnce(page(healthy(100, 'b'), 250))
      .mockResolvedValueOnce(page(healthy(50, 'c'), 250));
    const report = await audit({ max_pods: 2000 });
    expect(context.execute.mock.calls.map((call) => call[1].query.page)).toEqual([1, 2, 3]);
    expect(report).toMatchObject({ pods_in_window: 250, pods_checked: 250, complete: true });
  });

  it('stops after a full last page once the total is reached', async () => {
    context.execute.mockResolvedValueOnce(page(healthy(100), 100));
    await audit();
    expect(context.execute).toHaveBeenCalledTimes(1);
  });

  it('stops at max_pods and says the window was not fully read', async () => {
    context.execute.mockResolvedValueOnce(page(healthy(100, 'a'), 250)).mockResolvedValueOnce(page(healthy(100, 'b'), 250));
    const report = await audit({ max_pods: 150 });
    expect(context.execute).toHaveBeenCalledTimes(2);
    expect(report).toMatchObject({ pods_in_window: 250, pods_checked: 150, complete: false });
  });

  it('passes on the error the read failed with, code included', async () => {
    context.execute.mockResolvedValue({ data: null, errors: [{ message: 'Access Denied', extensions: { code: 'FORBIDDEN' } }] });
    const error = await audit().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(GraphQLError);
    expect(error).toMatchObject({ message: 'Access Denied', extensions: { code: 'FORBIDDEN' } });
  });

  it('fails clearly when the read returns neither pods nor an error', async () => {
    context.execute.mockResolvedValue({ data: { podsTable: null } });
    await expect(audit()).rejects.toMatchObject({ message: 'Pods could not be read', extensions: { code: 'GRAPHQL_ERROR' } });
  });

  it('fails a later page the same way, without auditing a partial window', async () => {
    context.execute.mockResolvedValueOnce(page(healthy(100), 300)).mockResolvedValueOnce({ data: null, errors: [{ message: 'Timeout' }] });
    await expect(audit()).rejects.toMatchObject({ message: 'Timeout', extensions: { code: 'GRAPHQL_ERROR' } });
  });
});

describe('pods_audit_timings — the report', () => {
  it('summarises a clean window', async () => {
    context.execute.mockResolvedValue(page(healthy(3), 3));
    const report = await audit();
    expect(report).toMatchObject({ errors: 0, warnings: 0, by_check: {}, issues: [], issues_truncated: false });
    expect(report.checks_skipped).toHaveLength(3);
  });

  it('counts issues by check and lists errors before warnings', async () => {
    const rows = [
      row('open', 0, null), // warning: MISSING_END
      row('backwards', 0, -10), // error: END_NOT_AFTER_START
      row('late', 0, 30, { created_at: new Date(NOW + 5 * MIN).toISOString() }), // warning: CREATED_AFTER_START
      row('early', 0, 30, { completed_at: new Date(NOW - 5 * MIN).toISOString() }), // error: COMPLETED_BEFORE_START
    ];
    context.execute.mockResolvedValue(page(rows, 4));
    const report = await audit();
    expect(report).toMatchObject({ errors: 2, warnings: 2 });
    expect(report.by_check).toEqual({ MISSING_END: 1, END_NOT_AFTER_START: 1, CREATED_AFTER_START: 1, COMPLETED_BEFORE_START: 1 });
    expect(report.issues.map((issue) => issue.severity)).toEqual(['error', 'error', 'warning', 'warning']);
    expect(report.issues.map((issue) => issue.pod_id)).toEqual(['backwards', 'early', 'open', 'late']);
  });

  it('returns at most max_issues issues, errors kept first, and says it cut them', async () => {
    const rows = [...Array.from({ length: 5 }, (_, i) => row(`open${i}`, 0, null)), row('backwards', 0, -10)];
    context.execute.mockResolvedValue(page(rows, rows.length));
    const report = await audit({ max_issues: 2 });
    expect(report.issues.map((issue) => issue.pod_id)).toEqual(['backwards', 'open0']);
    expect(report).toMatchObject({ issues_truncated: true, warnings: 5, errors: 1 });
  });

  it('runs the threshold checks with the thresholds given', async () => {
    context.execute.mockResolvedValue(page([row('short', -600, -590)], 1));
    const report = await audit({ min_duration_minutes: 30, completion_grace_minutes: 60 });
    expect(report.by_check).toEqual({ TOO_SHORT: 1, NOT_COMPLETED_AFTER_END: 1 });
    expect(report.checks_run).toEqual(expect.arrayContaining(['TOO_SHORT', 'NOT_COMPLETED_AFTER_END']));
    expect(report.checks_skipped).toEqual(['TOO_LONG — pass max_duration_minutes to check it']);
  });

  it('judges overdue completion against the current time', async () => {
    context.execute.mockResolvedValue(page([row('ended', -120, -61)], 1));
    expect((await audit({ completion_grace_minutes: 60 })).by_check).toEqual({ NOT_COMPLETED_AFTER_END: 1 });
    context.execute.mockResolvedValue(page([row('ended', -120, -59)], 1));
    expect((await audit({ completion_grace_minutes: 60 })).by_check).toEqual({});
  });
});

describe('pods_audit_timings — arguments', () => {
  it('refuses a window that does not move forward', async () => {
    const error = await audit({ from: '2026-11-01', to: '2026-10-01' }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(GraphQLError);
    expect(error).toMatchObject({ message: '`from` must be before `to`', extensions: { code: 'BAD_USER_INPUT' } });
    await expect(audit({ from: '2026-10-01', to: '2026-10-01' })).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    expect(context.execute).not.toHaveBeenCalled();
  });

  it('refuses a `from` after the default `to` when only `from` is given', async () => {
    await expect(audit({ from: new Date(NOW + 61 * DAY).toISOString() })).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });

  it.each([
    [{ from: 'next week' }],
    [{ to: 'soon' }],
    [{ max_pods: 0 }],
    [{ max_pods: 2001 }],
    [{ max_issues: 0 }],
    [{ max_issues: 501 }],
    [{ min_duration_minutes: -1 }],
    [{ max_duration_minutes: 1.5 }],
    [{ completion_grace_minutes: 100_001 }],
    [{ club_id: '' }],
    [{ fix: true }],
  ])('refuses %j before reading anything', async (args) => {
    await expect(audit(args)).rejects.toBeInstanceOf(ToolInputError);
    expect(context.execute).not.toHaveBeenCalled();
  });
});
