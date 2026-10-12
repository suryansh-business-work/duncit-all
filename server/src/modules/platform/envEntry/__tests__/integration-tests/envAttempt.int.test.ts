import { envAttemptService } from '../../envAttempt.service';
import { envEntryService } from '../../envEntry.service';
import { envEntryTests } from '../../envEntry.tests';
import { EnvEntryModel } from '../../envEntry.model';

const jwt = `h.${Buffer.from(JSON.stringify({ exp: Date.UTC(2030, 0, 2) / 1000 })).toString('base64')}.s`;

const shiprocketEntry = (name: string) =>
  envEntryService.create({
    name,
    category: 'SHIPROCKET',
    config: { email: 'api@example.com', password: 'not-a-real-password', pickup_location: 'Main' },
  });

const HOUR_MS = 3_600_000;

describe('env test attempts', () => {
  afterEach(() => {
    delete (global as any).fetch;
  });

  it('lists every category with its cap: ShipRocket capped by default, the rest unlimited', async () => {
    const settings = await envAttemptService.settings();
    expect(settings.window_hours).toBe(24);
    const byCategory = Object.fromEntries(settings.limits.map((l) => [l.category, l]));
    expect(byCategory.SHIPROCKET).toMatchObject({ label: 'ShipRocket', max_attempts: 5 });
    expect(byCategory.EMAIL.max_attempts).toBe(0);
    expect(settings.limits.length).toBeGreaterThan(20);
  });

  it('saves the window and the caps it is given, and keeps the cap of a category left out', async () => {
    await envAttemptService.updateSettings({ window_hours: 12, limits: [{ category: 'RAZORPAY', max_attempts: 3 }] });
    const saved = await envAttemptService.updateSettings({ window_hours: 6, limits: [{ category: 'EMAIL', max_attempts: 9 }] });
    const byCategory = Object.fromEntries(saved.limits.map((l) => [l.category, l.max_attempts]));
    expect(saved.window_hours).toBe(6);
    expect(byCategory).toMatchObject({ RAZORPAY: 3, EMAIL: 9, SHIPROCKET: 5 });
    // 0 is a real choice — it lifts ShipRocket's default cap, it does not fall back to it.
    const lifted = await envAttemptService.updateSettings({ window_hours: 6, limits: [{ category: 'SHIPROCKET', max_attempts: 0 }] });
    expect(lifted.limits.find((l) => l.category === 'SHIPROCKET')?.max_attempts).toBe(0);
  });

  it('refuses a window or a cap out of range, a fraction, and a category it does not know', async () => {
    const save = (window_hours: unknown, max_attempts: number, category = 'EMAIL') =>
      envAttemptService.updateSettings({ window_hours, limits: [{ category, max_attempts }] });
    await expect(save(0, 1)).rejects.toThrow('The window must be a whole number from 1 to 720');
    await expect(save(721, 1)).rejects.toThrow('The window must be a whole number from 1 to 720');
    await expect(save(24, -1)).rejects.toThrow('Max attempts for Email (SMTP) must be a whole number from 0 to 1000');
    await expect(save(24, 1.5)).rejects.toThrow('Max attempts for Email (SMTP) must be a whole number from 0 to 1000');
    await expect(save(24, 1, 'NOT_A_CATEGORY')).rejects.toThrow('Unknown category NOT_A_CATEGORY');
  });

  it('counts every test of an entry, and reports how many are left after each', async () => {
    await envAttemptService.updateSettings({ window_hours: 24, limits: [{ category: 'SHIPROCKET', max_attempts: 3 }] });
    const entry = await shiprocketEntry('SR count');
    expect(await envAttemptService.forEntry(entry!.id)).toEqual({ used: 0, max: 3, left: 3, window_hours: 24, resets_at: null });

    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ token: jwt }) });
    const first = await envEntryTests.connection(entry!.id, null, null);
    expect(first.ok).toBe(true);
    expect(first.attempts).toMatchObject({ used: 1, max: 3, left: 2 });
    const second = await envEntryTests.connection(entry!.id, null, null);
    expect(second.attempts).toMatchObject({ used: 2, max: 3, left: 1 });
    // The window ends its length after the FIRST test, not after the latest.
    const startedAt = (await EnvEntryModel.findById(entry!.id).lean())!.test_window_started_at!.getTime();
    expect(second.attempts.resets_at).toBe(new Date(startedAt + 24 * HOUR_MS).toISOString());
    expect(await envAttemptService.forEntry(entry!.id)).toMatchObject({ used: 2, left: 1 });
  });

  it('stops at the cap: the next test is answered without reaching the vendor or stamping an outcome', async () => {
    await envAttemptService.updateSettings({ window_hours: 24, limits: [{ category: 'SHIPROCKET', max_attempts: 2 }] });
    const entry = await shiprocketEntry('SR cap');
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ token: jwt }) });
    (global as any).fetch = fetchMock;
    await envEntryTests.connection(entry!.id, null, null);
    await envEntryTests.connection(entry!.id, null, null);
    const stamped = (await envEntryService.get(entry!.id))?.last_tested_at;

    const refused = await envEntryTests.connection(entry!.id, null, null);

    expect(refused.ok).toBe(false);
    expect(refused.message).toMatch(/^Test limit reached: 2 of 2 attempts used in the last 24 hours\. Nothing was sent/);
    expect(refused.attempts).toMatchObject({ used: 2, max: 2, left: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // A passing entry stays passing: the refused test never tried the credentials.
    const after = await envEntryService.get(entry!.id);
    expect(after?.last_test_ok).toBe(true);
    expect(after?.last_tested_at).toBe(stamped);
  });

  it('gives the last attempt to one of two tests racing for it, never both', async () => {
    await envAttemptService.updateSettings({ window_hours: 24, limits: [{ category: 'SHIPROCKET', max_attempts: 1 }] });
    const entry = await shiprocketEntry('SR race');
    const results = await Promise.all([envAttemptService.spend(entry!.id), envAttemptService.spend(entry!.id)]);
    expect(results.filter((r) => r.allowed)).toHaveLength(1);
    expect((await envAttemptService.forEntry(entry!.id)).used).toBe(1);
  });

  it('starts a new window once the old one has run its length', async () => {
    await envAttemptService.updateSettings({ window_hours: 2, limits: [{ category: 'SHIPROCKET', max_attempts: 1 }] });
    const entry = await shiprocketEntry('SR window');
    expect((await envAttemptService.spend(entry!.id)).allowed).toBe(true);
    expect((await envAttemptService.spend(entry!.id)).allowed).toBe(false);

    await EnvEntryModel.updateOne({ _id: entry!.id }, { $set: { test_window_started_at: new Date(Date.now() - 3 * HOUR_MS) } });

    // A reader sees the lapsed window as empty before anything resets it…
    expect(await envAttemptService.forEntry(entry!.id)).toMatchObject({ used: 0, left: 1, resets_at: null });
    // …and the next test opens a fresh one.
    const next = await envAttemptService.spend(entry!.id);
    expect(next.allowed).toBe(true);
    expect(next.attempts).toMatchObject({ used: 1, left: 0 });
  });

  it('counts but never stops a category with no cap', async () => {
    await envAttemptService.updateSettings({ window_hours: 24, limits: [{ category: 'PEXELS', max_attempts: 0 }] });
    const entry = await envEntryService.create({ name: 'PX unlimited', category: 'PEXELS', config: { api_key: 'k' } });
    for (let i = 0; i < 4; i += 1) expect((await envAttemptService.spend(entry!.id)).allowed).toBe(true);
    expect(await envAttemptService.forEntry(entry!.id)).toMatchObject({ used: 4, max: 0, left: null });
  });

  it('answers not-found for an entry that does not exist', async () => {
    const missing = '507f1f77bcf86cd799439011';
    await expect(envAttemptService.forEntry(missing)).rejects.toThrow('Environment entry not found');
    await expect(envAttemptService.spend(missing)).rejects.toThrow('Environment entry not found');
  });
});
