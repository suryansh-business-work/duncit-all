/**
 * The telemetry corners the main suites skip: a feed key minted for a settings
 * row that predates it, a partial settings save, a log that carries data and
 * one that carries none, the people a log or bug names, and what an import
 * does with the blanks in a file from another database.
 */
import { Types } from 'mongoose';
import { telemetryService, type TelemetryLogImportEntry } from '../../telemetry.service';
import { BugModel, TelemetryLogModel, TelemetrySettingsModel, getTelemetrySettings } from '../../telemetry.model';

const actor = { id: 'admin-1' };
const base = { app: 'mWeb', platform: 'web', environment: 'production', level: 'error', page: '/pay', component: 'PayBtn' } as const;

describe('the feed key', () => {
  it('is minted when the settings row predates it, and kept afterwards', async () => {
    await TelemetrySettingsModel.collection.insertOne({ singleton_key: 'telemetry', signoz_enabled: true });
    const first = await getTelemetrySettings();
    expect(first.public_api_key).toMatch(/\S{16,}/);
    const again = await getTelemetrySettings();
    expect(again.public_api_key).toBe(first.public_api_key);
    expect((await TelemetrySettingsModel.collection.findOne({ singleton_key: 'telemetry' }))?.public_api_key).toBe(first.public_api_key);
  });

  it('replaces a key that was stored blank, which the feed would refuse everything with', async () => {
    await TelemetrySettingsModel.collection.insertOne({ singleton_key: 'telemetry', public_api_key: '' });
    const doc = await getTelemetrySettings();
    expect(doc.public_api_key).toMatch(/^[0-9a-f]{16,}$/);
    expect((await getTelemetrySettings()).public_api_key).toBe(doc.public_api_key);
  });
});

describe('a partial settings save', () => {
  it('changes only the retention and leaves the levels and the switch alone', async () => {
    const before = await telemetryService.getSettings();
    const after = await telemetryService.updateSettings({ retention_days: 45 });
    expect(after.retention_days).toBe(45);
    expect(after.persisted_levels).toEqual(before.persisted_levels);
    expect(after.signoz_enabled).toBe(before.signoz_enabled);
    const toggled = await telemetryService.updateSettings({ signoz_enabled: false });
    expect(toggled).toMatchObject({ signoz_enabled: false, retention_days: 45 });
  });
});

describe('logs with and without people, data and errors', () => {
  it('records an anonymous log, tallies it on the bug and keeps the last known user off it', async () => {
    await telemetryService.recordTelemetryLog({ ...base, error: { name: 'TypeError', message: 'nope', stack: 's' } });
    const bug = await BugModel.findOne().lean();
    expect(bug).toMatchObject({ anonymous_count: 1, occurrence_count: 1 });
    expect(bug?.last_user).toBeUndefined();
    const log = await TelemetryLogModel.findOne().lean();
    expect(log?.user).toBeUndefined();
  });

  it('records a signed-in log, names the person on the bug, and keeps them when an anonymous one follows', async () => {
    const id = String(new Types.ObjectId());
    const error = { name: 'TypeError', message: 'nope', stack: 's' };
    await telemetryService.recordTelemetryLog({ ...base, error, user: { id, roles: ['USER'] } });
    await telemetryService.recordTelemetryLog({ ...base, error });
    const bug = await BugModel.findOne().lean();
    expect(bug?.last_user?.id).toBe(id);
    expect(bug).toMatchObject({ anonymous_count: 1, occurrence_count: 2 });
  });

  it('renders a stored log with its data as JSON and one without as null', async () => {
    const withData = await TelemetryLogModel.create({ ...base, source: 'mweb', data: { cart: 3 } } as never);
    const without = await TelemetryLogModel.create({ ...base, source: 'mweb' } as never);
    expect((await telemetryService.telemetryLog(String(withData._id)))?.data_json).toBe('{"cart":3}');
    expect((await telemetryService.telemetryLog(String(without._id)))?.data_json).toBeNull();
  });

  it('lists occurrences for a bug whose logs carry no error object, matching on the component', async () => {
    const bug = await BugModel.create({
      fingerprint: 'fp-component', title: 'Boom', page: '/pay', source: 'mweb', app: 'mWeb', platform: 'web', status: 'OPEN',
      last_seen_at: new Date(), first_seen_at: new Date(),
    } as never);
    await TelemetryLogModel.create({ ...base, source: 'mweb' } as never);
    const found = await telemetryService.bugOccurrences(String(bug._id));
    expect(Array.isArray(found)).toBe(true);
  });
});

describe('importing blanks from another database', () => {
  const entry = (over: Partial<TelemetryLogImportEntry> = {}): TelemetryLogImportEntry => ({
    id: String(new Types.ObjectId()), app: 'mWeb', level: 'error', page: '/p', component: 'C', created_at: new Date().toISOString(), ...over,
  });

  it('keeps a staging environment, reads empty and non-string data as none, and carries a user with or without roles', async () => {
    const a = entry({ environment: 'staging', data_json: '', user: { id: 'u-1', roles: ['USER'] } });
    const b = entry({ data_json: 42 as never, user: { id: 'u-2' } });
    const c = entry({ environment: 'moon' as never, user: { id: '  ' } });
    await telemetryService.importLogs([a, b, c], actor);
    const rows = Object.fromEntries((await TelemetryLogModel.find().lean()).map((r) => [String(r._id), r]));
    expect(rows[a.id as string]).toMatchObject({ environment: 'staging', user: { id: 'u-1', roles: ['USER'] } });
    expect(rows[a.id as string].data).toBeUndefined();
    expect(rows[b.id as string].user?.id).toBe('u-2');
    expect(rows[b.id as string].user?.roles ?? []).toEqual([]);
    expect(rows[b.id as string].data).toBeUndefined();
    expect(rows[c.id as string]).toMatchObject({ environment: 'production' });
    expect(rows[c.id as string].user).toBeUndefined();
  });

  it('imports a bug whose last user has an id but no roles', async () => {
    await telemetryService.importBugs(
      [{ fingerprint: 'fp-x', title: 'Imported', page: '/p', source: 'mweb:pay', last_user: { id: 'u-9' } }],
      actor,
    );
    const stored = await BugModel.findOne({ fingerprint: 'fp-x' }).lean();
    expect(stored?.last_user?.id).toBe('u-9');
  });
});
