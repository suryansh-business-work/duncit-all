import { Types } from 'mongoose';
import {
  telemetryService,
  telemetryDeleteIsUnscoped,
  type BugImportEntry,
  type TelemetryLogImportEntry,
} from '../../telemetry.service';
import { BugModel, TelemetryLogModel } from '../../telemetry.model';

const actor = { id: 'admin-1' };
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

async function seedLog(over: Record<string, unknown> = {}) {
  return TelemetryLogModel.create({
    app: 'mWeb',
    platform: 'web',
    environment: 'production',
    source: 'mweb',
    level: 'error',
    page: '/home',
    component: 'Home',
    ...over,
  } as never);
}

async function seedBug(over: Record<string, unknown> = {}) {
  return BugModel.create({
    fingerprint: `fp-${new Types.ObjectId()}`,
    title: 'Boom',
    page: '/home',
    source: 'mweb',
    app: 'mWeb',
    platform: 'web',
    status: 'OPEN',
    last_seen_at: new Date(),
    first_seen_at: new Date(),
    ...over,
  } as never);
}

describe('public feeds', () => {
  it('filters logs by level, environment, source, user, session, ip and time window', async () => {
    await seedLog({ level: 'warn', environment: 'staging', source: 'admin', page: '/a' });
    await seedLog({ level: 'error', user: { id: 'u1' }, session_id: 's1', ip: '1.1.1.1', page: '/b' });
    await seedLog({ level: 'error', page: '/old', created_at: hoursAgo(50) });
    const pages = async (f: Parameters<typeof telemetryService.publicLogsFeed>[0]) =>
      (await telemetryService.publicLogsFeed(f)).map((l) => l.page).sort();
    expect(await pages({})).toEqual(['/a', '/b', '/old']);
    expect(await pages({ level: 'warn' })).toEqual(['/a']);
    expect(await pages({ level: 'bogus' })).toEqual(['/a', '/b', '/old']);
    expect(await pages({ environment: 'staging' })).toEqual(['/a']);
    expect(await pages({ source: 'admin' })).toEqual(['/a']);
    expect(await pages({ session_id: 's1' })).toEqual(['/b']);
    expect(await pages({ ip: '1.1.1.1' })).toEqual(['/b']);
    expect(await pages({ since_hours: 24 })).toEqual(['/a', '/b']);
    expect(await pages({ since_hours: 0 })).toEqual(['/a', '/b', '/old']);
    expect(await pages({ limit: 1 })).toHaveLength(1);
  });

  it('filters logs by user id', async () => {
    await seedLog({ user_id: 'u9', page: '/mine' });
    await seedLog({ page: '/other' });
    const rows = await telemetryService.publicLogsFeed({ user_id: 'u9' });
    expect(rows.map((r) => r.page)).toEqual(['/mine']);
  });

  it('filters bugs by status and source, newest first, honouring the limit', async () => {
    await seedBug({ status: 'RESOLVED', source: 'admin', title: 'old', last_seen_at: hoursAgo(5) });
    await seedBug({ status: 'OPEN', title: 'new', last_seen_at: hoursAgo(1) });
    const titles = async (f: Parameters<typeof telemetryService.publicBugsFeed>[0]) =>
      (await telemetryService.publicBugsFeed(f)).map((b) => b.title);
    expect(await titles({})).toEqual(['new', 'old']);
    expect(await titles({ status: 'RESOLVED' })).toEqual(['old']);
    expect(await titles({ status: 'NOPE' })).toEqual(['new', 'old']);
    expect(await titles({ source: 'admin' })).toEqual(['old']);
    expect(await titles({ limit: 1 })).toEqual(['new']);
  });

  it('reports the ceiling a feed applies', () => {
    expect(telemetryService.logFeedLimit()).toBe(200);
    expect(telemetryService.logFeedLimit(0)).toBe(200);
    expect(telemetryService.logFeedLimit(-4)).toBe(200);
    expect(telemetryService.logFeedLimit(50)).toBe(50);
    expect(telemetryService.logFeedLimit(1_000_000)).toBe(5000);
    expect(telemetryService.bugFeedLimit()).toBe(5000);
    expect(telemetryService.bugFeedLimit(25)).toBe(25);
  });

  it('matches the public key in constant time and refuses blanks and near misses', async () => {
    const { key } = (await telemetryService.rotatePublicApiKey(actor)) as { key?: string };
    const settings = await telemetryService.getSettings();
    const real = key ?? (settings as { public_api_key?: string }).public_api_key ?? '';
    expect(real.length).toBeGreaterThan(8);
    expect(await telemetryService.publicKeyMatches(real)).toBe(true);
    expect(await telemetryService.publicKeyMatches('')).toBe(false);
    expect(await telemetryService.publicKeyMatches(`${real}x`)).toBe(false);
    expect(await telemetryService.publicKeyMatches(real.slice(0, -1) + (real.endsWith('a') ? 'b' : 'a'))).toBe(false);
  });
});

describe('deleting telemetry', () => {
  it('knows when a scope would empty the whole collection', () => {
    expect(telemetryDeleteIsUnscoped('LOGS', {})).toBe(true);
    expect(telemetryDeleteIsUnscoped('LOGS', { ids: [] })).toBe(false);
    expect(telemetryDeleteIsUnscoped('BUGS', { from: '2026-01-01' })).toBe(false);
  });

  it('deletes only the valid ticked ids and ignores malformed ones', async () => {
    const a = await seedLog();
    await seedLog({ page: '/keep' });
    const removed = await telemetryService.deleteTelemetryRecords('LOGS', { ids: [String(a._id), 'not-an-id'] }, actor);
    expect(removed).toBe(1);
    expect(await TelemetryLogModel.countDocuments()).toBe(1);
  });

  it('deleteBugs removes bugs by id', async () => {
    const b = await seedBug();
    await seedBug();
    expect(await telemetryService.deleteBugs([String(b._id)], actor)).toBe(1);
    expect(await BugModel.countDocuments()).toBe(1);
  });

  it('counts and deletes a date window with an open-ended side', async () => {
    await seedLog({ page: '/old', created_at: hoursAgo(100) });
    await seedLog({ page: '/mid', created_at: hoursAgo(40) });
    await seedLog({ page: '/new', created_at: hoursAgo(1) });
    const until = hoursAgo(24).toISOString();
    expect(await telemetryService.telemetryDeleteCount('LOGS', { to: until })).toBe(2);
    expect(await telemetryService.telemetryDeleteCount('LOGS', { from: hoursAgo(48).toISOString(), to: until })).toBe(1);
    expect(await telemetryService.telemetryDeleteCount('LOGS', { from: hoursAgo(48).toISOString() })).toBe(2);
    expect(await telemetryService.deleteTelemetryRecords('LOGS', { to: until }, actor)).toBe(2);
    expect((await TelemetryLogModel.find()).map((l) => l.page)).toEqual(['/new']);
  });

  it('refuses a bound it cannot read instead of widening the delete', async () => {
    await seedLog();
    await expect(telemetryService.deleteTelemetryRecords('LOGS', { to: 'yesterday-ish' }, actor)).rejects.toMatchObject({
      message: 'The to date could not be read',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    await expect(telemetryService.telemetryDeleteCount('BUGS', { from: 'x' })).rejects.toThrow('The from date could not be read');
    expect(await TelemetryLogModel.countDocuments()).toBe(1);
  });

  it('with no scope at all it clears the collection', async () => {
    await seedBug();
    await seedBug();
    expect(await telemetryService.deleteTelemetryRecords('BUGS', {}, actor)).toBe(2);
  });
});

describe('importing', () => {
  const bug = (over: Partial<BugImportEntry> = {}): BugImportEntry => ({
    fingerprint: ' fp-1 ',
    title: 'Imported',
    page: '/p',
    source: 'mweb:checkout',
    ...over,
  });

  it('creates then updates bugs on fingerprint, filling defaults and clamping counts', async () => {
    const res1 = await telemetryService.importBugs([bug()], actor);
    expect(res1).toEqual({ created: 1, updated: 0 });
    const stored = await BugModel.findOne({ fingerprint: 'fp-1' });
    expect(stored).toMatchObject({
      error_name: 'Error',
      message: '',
      app: 'mweb',
      platform: 'unknown',
      occurrence_count: 1,
      status: 'OPEN',
      affected_user_count: 0,
      anonymous_count: 0,
    });
    const res2 = await telemetryService.importBugs(
      [
        bug({
          title: 'Retitled',
          app: 'admin',
          occurrence_count: 7,
          status: 'RESOLVED',
          env_counts: { production: 3, staging: -2, localhost: null },
          last_user: { id: 'u1', roles: ['USER'] },
          affected_user_ids: ['u1', 'u2'],
          first_seen_at: '2026-01-01T00:00:00Z',
          last_seen_at: 'not-a-date',
        }),
      ],
      actor
    );
    expect(res2).toEqual({ created: 0, updated: 1 });
    const after = await BugModel.findOne({ fingerprint: 'fp-1' });
    expect(after).toMatchObject({ title: 'Retitled', app: 'admin', occurrence_count: 7, status: 'RESOLVED' });
    expect(after?.env_counts).toMatchObject({ production: 3, staging: 0, localhost: 0 });
    expect(after?.last_user?.id).toBe('u1');
    expect(after?.first_seen_at.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('keeps an unknown status OPEN and rejects an empty fingerprint', async () => {
    await telemetryService.importBugs([bug({ fingerprint: 'fp-2', status: 'WEIRD' })], actor);
    expect((await BugModel.findOne({ fingerprint: 'fp-2' }))?.status).toBe('OPEN');
    await expect(telemetryService.importBugs([bug({ fingerprint: '   ' })], actor)).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('imports logs once per id, reports repeats as skipped and flags rows already past retention', async () => {
    const id = String(new Types.ObjectId());
    const entry = (over: Partial<TelemetryLogImportEntry> = {}): TelemetryLogImportEntry => ({
      id,
      app: 'mWeb',
      level: 'error',
      page: '/p',
      component: 'C',
      data_json: '{"a":1}',
      created_at: new Date().toISOString(),
      ...over,
    });
    expect(await telemetryService.importLogs([], actor)).toEqual({ created: 0, skipped: 0, expiring: 0 });
    const first = await telemetryService.importLogs([entry(), entry()], actor);
    expect(first).toMatchObject({ created: 1, skipped: 1 });
    const second = await telemetryService.importLogs([entry()], actor);
    expect(second).toMatchObject({ created: 0, skipped: 1 });
    const old = await telemetryService.importLogs(
      [entry({ id: String(new Types.ObjectId()), created_at: hoursAgo(24 * 80).toISOString(), data_json: 'not json' })],
      actor
    );
    expect(old.created).toBe(1);
    expect(old.expiring).toBe(1);
    const stored = await TelemetryLogModel.findById(id).lean();
    expect(stored?.data).toEqual({ a: 1 });
  });
});

describe('reads and exports', () => {
  const record = (message: string, page = '/checkout') =>
    telemetryService.recordTelemetryLog({
      app: 'mWeb',
      platform: 'web',
      environment: 'production',
      level: 'error',
      page,
      component: 'PayBtn',
      error: { name: 'TypeError', message, stack: 's' },
    });

  it('reads one log and returns null when it is gone', async () => {
    const log = await seedLog({ page: '/one' });
    expect((await telemetryService.telemetryLog(String(log._id)))?.page).toBe('/one');
    expect(await telemetryService.telemetryLog(String(new Types.ObjectId()))).toBeNull();
  });

  it('lists the occurrences behind one bug, matching by fingerprint and bounding the count', async () => {
    await record('order 11 failed');
    await record('order 22 failed');
    await record('totally different problem');
    await record('thing on another page', '/elsewhere');
    const bug = (await BugModel.findOne({ title: /order/i }))!;
    const all = await telemetryService.bugOccurrences(String(bug._id));
    expect(all).toHaveLength(2);
    expect(all.every((l) => /order/.test(l.error?.message ?? ''))).toBe(true);
    expect(await telemetryService.bugOccurrences(String(bug._id), 1)).toHaveLength(1);
    expect(await telemetryService.bugOccurrences(String(bug._id), 0)).toHaveLength(2);
    expect(await telemetryService.bugOccurrences(String(bug._id), 9999)).toHaveLength(2);
  });

  it('refuses occurrences of an unknown bug', async () => {
    await expect(telemetryService.bugOccurrences(String(new Types.ObjectId()))).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    });
  });

  it('exports every bug newest first, and bug lookups return null for a missing id', async () => {
    await seedBug({ title: 'older', last_seen_at: hoursAgo(9) });
    await seedBug({ title: 'newer', last_seen_at: hoursAgo(1) });
    expect((await telemetryService.bugsExport()).map((b) => b.title)).toEqual(['newer', 'older']);
    expect(await telemetryService.bug(String(new Types.ObjectId()))).toBeNull();
  });

  it('exports logs of one level and bounds the row count', async () => {
    await seedLog({ level: 'warn', page: '/w' });
    await seedLog({ level: 'error', page: '/e1', created_at: hoursAgo(2) });
    await seedLog({ level: 'error', page: '/e2', created_at: hoursAgo(1) });
    expect((await telemetryService.logsExport('error')).map((l) => l.page)).toEqual(['/e2', '/e1']);
    expect(await telemetryService.logsExport('nonsense')).toHaveLength(3);
    expect(await telemetryService.logsExport(null, 1)).toHaveLength(1);
    expect(await telemetryService.logsExport(undefined, 0)).toHaveLength(3);
    expect(await telemetryService.logsExport(undefined, 10_000_000)).toHaveLength(3);
  });

  it('normalises a sparse imported log row: level, environment, names and ids default', async () => {
    const res = await telemetryService.importLogs(
      [
        {
          app: '  ',
          level: 'loud',
          page: ' ',
          component: '',
          environment: 'moon',
          error: { message: 'bad', name: ' ' },
          user: { id: ' u7 ', roles: ['USER'] },
          data_json: '[1,2]',
          created_at: 'garbage',
        },
      ],
      actor
    );
    expect(res.created).toBe(1);
    const row = (await TelemetryLogModel.findOne({ user_id: 'u7' }).lean())!;
    expect(row).toMatchObject({
      app: 'unknown',
      source: 'unknown',
      platform: 'unknown',
      level: 'info',
      environment: 'production',
      page: 'unknown',
      component: 'unknown',
    });
    expect(row.error).toMatchObject({ name: 'Error', message: 'bad' });
    expect(row.user).toMatchObject({ id: 'u7', roles: ['USER'] });
    expect(row.data).toBeUndefined();
  });
});

describe('public shapes', () => {
  it('renders a partial and a full client block, and a null one when absent', async () => {
    await seedLog({ page: '/none' });
    await seedLog({ page: '/partial', client: { app_version: '1.2.3' } });
    await seedLog({
      page: '/full',
      client: {
        app_version: '2.0',
        device_model: 'Pixel',
        device_os_version: '14',
        locale: 'en-IN',
        timezone: 'Asia/Kolkata',
        screen: '1080x2400',
        viewport: '400x800',
        network: '4g',
        referrer: 'https://x.test',
      },
    });
    const by = Object.fromEntries((await telemetryService.publicLogsFeed({})).map((l) => [l.page, l.client]));
    expect(by['/none']).toBeNull();
    expect(by['/partial']).toEqual({
      app_version: '1.2.3',
      device_model: null,
      device_os_version: null,
      locale: null,
      timezone: null,
      screen: null,
      viewport: null,
      network: null,
      referrer: null,
    });
    expect(by['/full']).toMatchObject({ device_model: 'Pixel', network: '4g', referrer: 'https://x.test' });
  });

  it('renders the last client, user and resolution of a resolved bug', async () => {
    const when = new Date('2026-04-01T00:00:00Z');
    await seedBug({
      status: 'RESOLVED',
      resolved_at: when,
      resolved_by: 'admin-2',
      last_user: { id: 'u5', roles: ['USER'] },
      last_client: { locale: 'hi-IN' },
      affected_user_count: 3,
      affected_user_ids: ['u5'],
      anonymous_count: 2,
    });
    await seedBug({ title: 'open one' });
    const rows = await telemetryService.publicBugsFeed({});
    const resolved = rows.find((b) => b.status === 'RESOLVED')!;
    expect(resolved).toMatchObject({
      resolved_at: when.toISOString(),
      resolved_by: 'admin-2',
      last_user: { id: 'u5', roles: ['USER'] },
      affected_user_count: 3,
      anonymous_count: 2,
    });
    expect(resolved.last_client).toMatchObject({ locale: 'hi-IN', app_version: null });
    const open = rows.find((b) => b.status === 'OPEN')!;
    expect(open).toMatchObject({ resolved_at: null, resolved_by: null, last_user: null, last_client: null, affected_user_ids: [] });
  });
});
