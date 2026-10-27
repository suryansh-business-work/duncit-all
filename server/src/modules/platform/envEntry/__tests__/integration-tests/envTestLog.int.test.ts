/**
 * The test history of an entry and the overview the Tech console reads: every
 * outcome is recorded once, the history is bounded and names who tested, and
 * the counts per category never read an entry's config. Plus the attempt
 * counter's edges that the main attempt suite does not reach.
 */
import { Types } from 'mongoose';
import { envTestLogService, recordTest } from '../../envTestLog.service';
import { envAttemptService } from '../../envAttempt.service';
import { EnvEntryModel } from '../../envEntry.model';
import { EnvTestLogModel } from '../../envTestLog.model';
import { UserModel } from '@modules/access/user/user.model';

const entry = (name: string, over: Record<string, unknown> = {}) =>
  EnvEntryModel.create({ name, category: 'EMAIL', config: { host: 'h' }, ...over });
const oid = () => new Types.ObjectId().toHexString();

describe('recordTest', () => {
  it('stamps the entry and appends one history line, and a pass also marks the entry used', async () => {
    const e = await entry('A');
    await recordTest({ id: String(e._id), ok: true, message: 'fine', kind: 'QUICK', actor: oid() });
    const stored = await EnvEntryModel.findById(e._id).lean();
    expect(stored).toMatchObject({ last_test_ok: true });
    expect(stored?.last_tested_at).toBeInstanceOf(Date);
    expect(stored?.last_used_at).toBeInstanceOf(Date);
    expect(await EnvTestLogModel.findOne().lean()).toMatchObject({ entry_name: 'A', category: 'EMAIL', kind: 'QUICK', ok: true, message: 'fine' });
  });

  it('does not mark a failed entry used, and truncates a long message and ignores a bad actor id', async () => {
    const e = await entry('A');
    await recordTest({ id: String(e._id), ok: false, message: 'x'.repeat(900), kind: 'EMAIL', actor: 'not-an-id' });
    const stored = await EnvEntryModel.findById(e._id).lean();
    expect(stored?.last_test_ok).toBe(false);
    expect(stored?.last_used_at ?? null).toBeNull();
    const log = await EnvTestLogModel.findOne().lean();
    expect(log?.message).toHaveLength(500);
    expect(log?.tested_by ?? null).toBeNull();
  });

  it('records a missing message as empty and no actor as nobody', async () => {
    const e = await entry('A');
    await recordTest({ id: String(e._id), ok: true, message: null, kind: 'QUICK', actor: null });
    await recordTest({ id: String(e._id), ok: true, kind: 'QUICK' });
    expect((await EnvTestLogModel.find().lean()).map((l) => [l.message, l.tested_by ?? null])).toEqual([['', null], ['', null]]);
  });

  it('does nothing for an entry that no longer exists', async () => {
    await recordTest({ id: oid(), ok: true, message: 'x', kind: 'QUICK' });
    expect(await EnvTestLogModel.countDocuments()).toBe(0);
  });
});

describe('history', () => {
  const log = (e: { _id: unknown; name: string }, over: Record<string, unknown> = {}) =>
    EnvTestLogModel.create({ entry_id: e._id, category: 'EMAIL', entry_name: e.name, kind: 'QUICK', ok: true, message: 'm', ...over });

  it('lists the newest first, naming who tested and leaving anonymous ones unnamed', async () => {
    const e = await entry('A');
    const person = await UserModel.create({ auth: { email: 'tester@duncit.com' }, profile: { first_name: 'Priya', last_name: 'Sharma' } });
    const nameless = { _id: (await UserModel.collection.insertOne({ auth: { email: 'nameless@duncit.com' }, profile: {} })).insertedId };
    await log(e, { message: 'first', tested_by: person._id });
    await new Promise((r) => setTimeout(r, 5));
    await log(e, { message: 'second' });
    await new Promise((r) => setTimeout(r, 5));
    await log(e, { message: 'third', tested_by: nameless._id });
    const rows = await envTestLogService.history(null, null);
    expect(rows.map((r) => [r.message, r.tested_by])).toEqual([['third', null], ['second', null], ['first', 'Priya Sharma']]);
    expect(rows[0]).toMatchObject({ entry_name: 'A', category: 'EMAIL', kind: 'QUICK', ok: true, entry_id: String(e._id) });
    expect(rows[0].created_at).toEqual(expect.any(String));
  });

  it('lists history that nobody has signed, without looking anyone up', async () => {
    const e = await entry('A');
    await log(e);
    expect((await envTestLogService.history(null, null)).map((r) => r.tested_by)).toEqual([null]);
  });

  it('filters by entry and category, and answers nothing for an unknown or malformed entry id', async () => {
    const a = await entry('A');
    const b = await entry('B', { category: 'PEXELS' });
    await log(a);
    await log(b, { category: 'PEXELS' });
    expect(await envTestLogService.history(String(a._id), 10)).toHaveLength(1);
    expect(await envTestLogService.history(undefined, 10, 'PEXELS')).toHaveLength(1);
    expect(await envTestLogService.history(String(a._id), 10, 'PEXELS')).toHaveLength(0);
    expect(await envTestLogService.history(oid(), 10)).toHaveLength(0);
    expect(await envTestLogService.history('not-an-id', 10)).toHaveLength(0);
  });

  it('keeps the page between 1 and 100, defaulting to 20', async () => {
    const e = await entry('A');
    await EnvTestLogModel.insertMany(Array.from({ length: 120 }, () => ({ entry_id: e._id, category: 'EMAIL', entry_name: 'A', kind: 'QUICK', ok: true, message: '' })));
    expect(await envTestLogService.history(null, null)).toHaveLength(20);
    expect(await envTestLogService.history(null, undefined)).toHaveLength(20);
    expect(await envTestLogService.history(null, 0)).toHaveLength(20);
    expect(await envTestLogService.history(null, -5)).toHaveLength(1);
    expect(await envTestLogService.history(null, 500)).toHaveLength(100);
    expect(await envTestLogService.history(null, 7)).toHaveLength(7);
  });
});

describe('overview', () => {
  it('counts passing, failing and untested entries in total and per category, and which services are ready', async () => {
    const pass = await entry('Pass', { is_default: true });
    await EnvEntryModel.updateOne({ _id: pass._id }, { last_tested_at: new Date(), last_test_ok: true });
    const fail = await entry('Fail', { is_active: false });
    await EnvEntryModel.updateOne({ _id: fail._id }, { last_tested_at: new Date(), last_test_ok: false });
    await entry('Untested', { category: 'PEXELS', is_default: true });
    const out = await envTestLogService.overview();
    expect(out).toMatchObject({ total: 3, active: 2, passing: 1, failing: 1, untested: 1, tested: 2 });
    expect(out.services).toBeGreaterThan(10);
    expect(out.services_ready).toBe(2);
    const email = out.categories.find((c) => c.category === 'EMAIL');
    expect(email).toMatchObject({ total: 2, active: 1, passing: 1, failing: 1, untested: 0, tested: 2 });
    expect(out.categories.find((c) => c.category === 'PEXELS')).toMatchObject({ total: 1, untested: 1 });
    expect(out.categories.find((c) => c.category === 'GEMINI')).toMatchObject({ total: 0 });
  });

  it('still counts an entry whose category this server no longer lists, in the total only', async () => {
    await EnvEntryModel.collection.insertOne({ name: 'Old', category: 'RETIRED', is_active: true, is_default: false, config: {}, assigned_portals: [] });
    const out = await envTestLogService.overview();
    expect(out.total).toBe(1);
    expect(out.categories.reduce((sum, c) => sum + c.total, 0)).toBe(0);
  });
});

describe('attempts: edges', () => {
  it('reports a missing entry as not found when reading or spending', async () => {
    await expect(envAttemptService.forEntry(oid())).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    await expect(envAttemptService.spend(oid())).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });

  it('refuses settings for a category it does not know and values out of bounds', async () => {
    await expect(envAttemptService.updateSettings({ window_hours: 24, limits: [{ category: 'NOPE', max_attempts: 1 }] })).rejects.toMatchObject({ message: 'Unknown category NOPE' });
    await expect(envAttemptService.updateSettings({ window_hours: 0, limits: [] })).rejects.toMatchObject({ message: 'The window must be a whole number from 1 to 720' });
    await expect(envAttemptService.updateSettings({ window_hours: 24, limits: [{ category: 'EMAIL', max_attempts: 5000 }] })).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    await expect(envAttemptService.updateSettings({ window_hours: 'abc', limits: [] })).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('saves the window with no limits given, keeping earlier caps, and falls back to the default window when a stored one is unusable', async () => {
    await envAttemptService.updateSettings({ window_hours: 12, limits: [{ category: 'EMAIL', max_attempts: 3 }] });
    const kept = await envAttemptService.updateSettings({ window_hours: 6 });
    expect(kept.window_hours).toBe(6);
    expect(kept.limits.find((l) => l.category === 'EMAIL')?.max_attempts).toBe(3);
    await envAttemptService.updateSettings({ window_hours: 6, limits: null });
    const { EnvAttemptSettingsModel } = await import('../../envAttempt.model');
    await EnvAttemptSettingsModel.updateOne({}, { $set: { window_hours: 0 } });
    expect((await envAttemptService.settings()).window_hours).toBe(24);
  });

  it('uses the category default cap, unlimited when it has none, and ignores a negative or fractional saved cap', async () => {
    const ship = await entry('Ship', { category: 'SHIPROCKET' });
    await expect(envAttemptService.forEntry(String(ship._id))).resolves.toMatchObject({ max: 5, left: 5, used: 0, resets_at: null });
    const mail = await entry('Mail');
    await expect(envAttemptService.forEntry(String(mail._id))).resolves.toMatchObject({ max: 0, left: null });
    const { EnvAttemptSettingsModel } = await import('../../envAttempt.model');
    await EnvAttemptSettingsModel.collection.updateOne({}, { $set: { limits: { EMAIL: -2, SHIPROCKET: 1.5 } } }, { upsert: true });
    await expect(envAttemptService.forEntry(String(mail._id))).resolves.toMatchObject({ max: 0 });
    await expect(envAttemptService.forEntry(String(ship._id))).resolves.toMatchObject({ max: 5 });
  });

  it('starts a new window once the old one has run out, and treats an entry with no count as having used none', async () => {
    const mail = await entry('Mail');
    await envAttemptService.updateSettings({ window_hours: 1, limits: [{ category: 'EMAIL', max_attempts: 2 }] });
    expect((await envAttemptService.spend(String(mail._id))).attempts.used).toBe(1);
    await EnvEntryModel.updateOne({ _id: mail._id }, { $set: { test_window_started_at: new Date(Date.now() - 2 * 3_600_000), test_attempts: 2 } });
    const after = await envAttemptService.spend(String(mail._id));
    expect(after).toMatchObject({ allowed: true, attempts: { used: 1, left: 1 } });
    await EnvEntryModel.collection.updateOne({ _id: mail._id }, { $unset: { test_attempts: 1 } });
    await expect(envAttemptService.forEntry(String(mail._id))).resolves.toMatchObject({ used: 0 });
  });

  it('refuses the attempt over the cap without spending it', async () => {
    const mail = await entry('Mail');
    await envAttemptService.updateSettings({ window_hours: 24, limits: [{ category: 'EMAIL', max_attempts: 1 }] });
    expect((await envAttemptService.spend(String(mail._id))).allowed).toBe(true);
    await expect(envAttemptService.spend(String(mail._id))).resolves.toMatchObject({ allowed: false, attempts: { used: 1, left: 0 } });
  });

  it('answers a refused attempt for an entry that vanished meanwhile as nothing used', async () => {
    const mail = await entry('Mail');
    await envAttemptService.updateSettings({ window_hours: 24, limits: [{ category: 'EMAIL', max_attempts: 1 }] });
    await envAttemptService.spend(String(mail._id));
    const realFind = EnvEntryModel.findById.bind(EnvEntryModel);
    let calls = 0;
    jest.spyOn(EnvEntryModel, 'findById').mockImplementation(((...args: Parameters<typeof realFind>) => {
      calls += 1;
      return calls >= 2 ? ({ select: () => ({ lean: () => Promise.resolve(calls === 2 ? { category: 'EMAIL' } : null) }) } as never) : realFind(...args);
    }) as never);
    const out = await envAttemptService.spend(String(mail._id));
    expect(out).toMatchObject({ allowed: false, attempts: { used: 0, resets_at: null } });
    jest.restoreAllMocks();
  });
});
