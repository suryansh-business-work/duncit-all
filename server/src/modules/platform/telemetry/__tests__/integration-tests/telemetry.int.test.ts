import { Types } from 'mongoose';
import { telemetryService, type TelemetryRecordInput } from '../../telemetry.service';
import { BugModel, TelemetryLogModel, TelemetrySettingsModel } from '../../telemetry.model';
import { telemetryResolvers } from '../../telemetry.resolver';
import { telemetryRuntime } from '@observability/telemetryRuntime';
import { makeContext } from '@test/harness';

function rec(over: Partial<TelemetryRecordInput> = {}): TelemetryRecordInput {
  return {
    app: 'mWeb',
    platform: 'web',
    environment: 'production',
    level: 'error',
    page: '/checkout',
    component: 'PayBtn',
    error: { name: 'TypeError', message: 'x is undefined', stack: 'at foo' },
    ...over,
  };
}

describe('telemetryService — settings', () => {
  it('creates + updates settings, clamping levels + retention and priming the runtime', async () => {
    const initial = await telemetryService.getSettings();
    expect(initial.signoz_enabled).toBe(true);
    expect(initial.persisted_levels).toEqual(['error', 'warn']);
    expect(initial.retention_days).toBe(30);

    // invalid level dropped + dedup; retention clamped to the 90 max; signoz toggled.
    const u1 = await telemetryService.updateSettings({
      signoz_enabled: false,
      persisted_levels: ['error', 'info', 'bogus' as never, 'error'],
      retention_days: 200,
    });
    expect(u1.signoz_enabled).toBe(false);
    expect(u1.persisted_levels).toEqual(['error', 'info']);
    expect(u1.retention_days).toBe(90);
    expect(telemetryRuntime.signozEnabled).toBe(false);

    // all-invalid levels + sub-1 retention fall back to defaults.
    const u2 = await telemetryService.updateSettings({
      persisted_levels: ['bogus' as never],
      retention_days: 0,
    });
    expect(u2.persisted_levels).toEqual(['error', 'warn']);
    expect(u2.retention_days).toBe(30);

    // NaN retention + non-array levels also fall back to defaults.
    const u3 = await telemetryService.updateSettings({
      retention_days: Number.NaN,
      persisted_levels: 'nope' as never,
    });
    expect(u3.retention_days).toBe(30);
    expect(u3.persisted_levels).toEqual(['error', 'warn']);

    // a valid in-range retention passes through unchanged.
    const u4 = await telemetryService.updateSettings({ retention_days: 45 });
    expect(u4.retention_days).toBe(45);
    expect(u4.signoz_enabled).toBe(false); // untouched fields persist
  });

  it('seeds the singleton idempotently', async () => {
    await telemetryService.seedDefaults();
    await telemetryService.seedDefaults();
    expect(await TelemetrySettingsModel.countDocuments({ singleton_key: 'telemetry' })).toBe(1);
    expect((await telemetryService.getSettings()).retention_days).toBe(30);
  });
});

describe('telemetryService — log persistence + bug rollup', () => {
  it('derives the source for every surface and rolls each error into its own bug', async () => {
    await telemetryService.recordTelemetryLog(rec({ app: 'mobileApp', os: 'ios' }));
    await telemetryService.recordTelemetryLog(rec({ app: 'mobileApp' }));
    await telemetryService.recordTelemetryLog(rec({ app: 'portal', portal: 'crm' }));
    await telemetryService.recordTelemetryLog(rec({ app: 'website', portal: 'duncit' }));
    await telemetryService.recordTelemetryLog(rec({ app: 'portal' }));
    await telemetryService.recordTelemetryLog(rec({ app: 'mWeb' }));

    const sources = (await TelemetryLogModel.find().lean()).map((l) => l.source).sort();
    expect(sources).toEqual(
      ['mWeb', 'mobileApp', 'mobileApp:ios', 'portal', 'portal:crm', 'website:duncit'].sort(),
    );
    // Distinct sources → distinct fingerprints → 6 bugs (message + page + platform).
    expect(await BugModel.countDocuments()).toBe(6);
  });

  it('persists a non-error log without creating a bug', async () => {
    await telemetryService.recordTelemetryLog(rec({ level: 'warn', error: undefined, data: { a: 1 } }));
    expect(await TelemetryLogModel.countDocuments()).toBe(1);
    expect(await BugModel.countDocuments()).toBe(0);
  });

  it('increments occurrences, splits env counts, and reopens a resolved bug on regression', async () => {
    await telemetryService.recordTelemetryLog(rec({ environment: 'staging' }));
    await telemetryService.recordTelemetryLog(rec({ environment: 'production' }));
    await telemetryService.recordTelemetryLog(rec({ environment: 'weird' as never }));

    let bug = await BugModel.findOne();
    expect(bug!.occurrence_count).toBe(3);
    expect(bug!.env_counts.staging).toBe(1);
    expect(bug!.env_counts.production).toBe(2); // production + the invalid env bucketed to production

    await telemetryService.updateBugStatus(String(bug!._id), 'RESOLVED', 'admin1');
    await telemetryService.recordTelemetryLog(rec({ environment: 'staging' }));
    bug = await BugModel.findById(bug!._id);
    expect(bug!.status).toBe('OPEN');
    expect(bug!.occurrence_count).toBe(4);
  });

  it('rolls an error log with no error object into a bug titled from the component', async () => {
    await telemetryService.recordTelemetryLog(rec({ error: undefined, component: 'BootSeq' }));
    const bug = await BugModel.findOne();
    expect(bug!.error_name).toBe('Error');
    expect(bug!.message).toBe('BootSeq');
    expect(bug!.last_stack).toBeUndefined();
  });

  it('dedupes errors whose messages differ only by ids', async () => {
    await telemetryService.recordTelemetryLog(rec({ error: { name: 'E', message: 'User 123 not found' } }));
    await telemetryService.recordTelemetryLog(rec({ error: { name: 'E', message: 'User 456 not found' } }));
    expect(await BugModel.countDocuments()).toBe(1);
    const bug = await BugModel.findOne();
    expect(bug!.occurrence_count).toBe(2);
    expect(bug!.title).toContain('<n>');
  });
});

describe('telemetryService — tables, reads, dashboard, cleanup', () => {
  it('serves paginated logs + bugs tables and maps the error subdoc both ways', async () => {
    await telemetryService.recordTelemetryLog(rec());
    await telemetryService.recordTelemetryLog(rec({ level: 'warn', error: undefined }));

    const logs = await telemetryService.logsTable({ page: 1, page_size: 10 });
    expect(logs.total).toBe(2);
    expect(logs.rows.find((r) => r.error)!.error!.name).toBe('TypeError');
    expect(logs.rows.find((r) => !r.error)!.error).toBeNull();

    const errOnly = await telemetryService.logsTable({
      filters: [{ field: 'level', op: 'eq', value: 'error' }],
    });
    expect(errOnly.total).toBe(1);

    const bugs = await telemetryService.bugsTable({ search: 'undefined' });
    expect(bugs.total).toBe(1);
    expect(bugs.rows[0]!.resolved_at).toBeNull();
  });

  it('reads a single bug and returns null for a missing id', async () => {
    await telemetryService.recordTelemetryLog(rec());
    const b = await BugModel.findOne();
    expect((await telemetryService.bug(String(b!._id)))!.id).toBe(String(b!._id));
    expect(await telemetryService.bug(new Types.ObjectId().toString())).toBeNull();
  });

  it('triages bug status: resolve stamps the resolver, other states clear it, invalid + missing throw', async () => {
    await telemetryService.recordTelemetryLog(rec());
    const b = await BugModel.findOne();

    const resolved = await telemetryService.updateBugStatus(String(b!._id), 'RESOLVED', 'admin9');
    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.resolved_at).not.toBeNull();

    const ignored = await telemetryService.updateBugStatus(String(b!._id), 'IGNORED', 'admin9');
    expect(ignored.status).toBe('IGNORED');
    expect(ignored.resolved_at).toBeNull();

    await expect(
      telemetryService.updateBugStatus(String(b!._id), 'BOGUS', 'a'),
    ).rejects.toThrow(/Invalid bug status/);
    await expect(
      telemetryService.updateBugStatus(new Types.ObjectId().toString(), 'OPEN', 'a'),
    ).rejects.toThrow(/not found/i);
  });

  it('aggregates the dashboard and clamps the range', async () => {
    await telemetryService.recordTelemetryLog(rec({ environment: 'production' }));
    await telemetryService.recordTelemetryLog(rec({ level: 'warn', environment: 'staging', error: undefined }));
    await telemetryService.recordTelemetryLog(rec({ app: 'portal', portal: 'crm' }));

    const d = await telemetryService.dashboard(7);
    expect(d.range_days).toBe(7);
    expect(d.total_logs).toBe(3);
    expect(d.active_bugs).toBeGreaterThanOrEqual(1);
    expect(d.by_level.find((b) => b.key === 'error')!.count).toBe(2);
    expect(d.by_source.some((b) => b.key === 'portal:crm')).toBe(true);
    expect(d.by_environment.some((b) => b.key === 'production')).toBe(true);
    expect(d.series.length).toBeGreaterThanOrEqual(1);
    expect(d.top_bugs.length).toBeGreaterThanOrEqual(1);

    expect((await telemetryService.dashboard()).range_days).toBe(7); // undefined → default
    expect((await telemetryService.dashboard(0)).range_days).toBe(7); // sub-1 → default
    expect((await telemetryService.dashboard(200)).range_days).toBe(90); // clamp to max
  });

  it('cleans logs + bugs past the retention window', async () => {
    await telemetryService.updateSettings({ retention_days: 1 });
    await telemetryService.recordTelemetryLog(rec());

    const old = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    await TelemetryLogModel.create({
      app: 'mWeb', platform: 'web', environment: 'production', source: 'mWeb',
      level: 'error', page: '/old', component: 'X', created_at: old,
    });
    await BugModel.create({
      fingerprint: 'oldfp', title: 'old', page: '/old', source: 'mWeb', app: 'mWeb',
      platform: 'web', last_seen_at: old,
    });

    const res = await telemetryService.runTelemetryCleanup();
    expect(res.logs_deleted).toBe(1);
    expect(res.bugs_deleted).toBe(1);
    expect(await TelemetryLogModel.countDocuments()).toBe(1);
    expect(await BugModel.countDocuments()).toBe(1);
  });
});

describe('telemetryResolvers', () => {
  const ctx = makeContext({ id: 'admin1', roles: ['TECH_MANAGER'] });
  const anon = makeContext(null);

  it('gates every query/mutation by role and delegates to the service', async () => {
    await telemetryService.recordTelemetryLog(rec());
    const bug = await BugModel.findOne();

    expect((await telemetryResolvers.Query.telemetrySettings({}, {}, ctx)).retention_days).toBe(30);
    expect(
      (await telemetryResolvers.Query.telemetryDashboard({}, { range_days: 7 }, ctx)).range_days,
    ).toBe(7);
    expect((await telemetryResolvers.Query.telemetryLogsTable({}, { query: null }, ctx)).total).toBe(1);
    expect((await telemetryResolvers.Query.bugsTable({}, { query: null }, ctx)).total).toBe(1);
    expect((await telemetryResolvers.Query.bug({}, { id: String(bug!._id) }, ctx))!.id).toBe(
      String(bug!._id),
    );

    const s = await telemetryResolvers.Mutation.updateTelemetrySettings(
      {},
      { input: { retention_days: 10 } },
      ctx,
    );
    expect(s.retention_days).toBe(10);
    const upd = await telemetryResolvers.Mutation.updateBugStatus(
      {},
      { bug_id: String(bug!._id), status: 'RESOLVED' },
      ctx,
    );
    expect(upd.status).toBe('RESOLVED');
  });

  it('rejects unauthenticated access', () => {
    expect(() => telemetryResolvers.Query.telemetrySettings({}, {}, anon)).toThrow();
    expect(() =>
      telemetryResolvers.Mutation.updateBugStatus({}, { bug_id: 'x', status: 'OPEN' }, anon),
    ).toThrow();
  });
});

describe('telemetry ingest wiring', () => {
  // Runs last: registers the process-global funnel handler, so keep it isolated.
  it('persists selected-level logs through the funnel bridge and swallows bad records', async () => {
    await telemetryService.seedDefaults();
    telemetryService.enableIngestion();

    telemetryRuntime.persist(rec({ page: '/viaFunnel' }));
    telemetryRuntime.persist({ level: 'error' }); // missing required fields → rejects → swallowed

    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(await TelemetryLogModel.countDocuments({ page: '/viaFunnel' })).toBe(1);
  });
});
