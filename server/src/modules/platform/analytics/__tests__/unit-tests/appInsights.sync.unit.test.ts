jest.mock('@observability/log', () => ({
  logs: { server: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } },
}));
jest.mock('../../appInsights/appInsights.model', () => ({
  AppInsightStateModel: { updateOne: jest.fn(), findOneAndUpdate: jest.fn(), findOne: jest.fn() },
  AppInsightSyncLogModel: { create: jest.fn(), updateOne: jest.fn() },
}));
jest.mock('../../appInsights/appInsights.config', () => ({
  readPlayInsightsConfig: jest.fn(),
  readAppleInsightsConfig: jest.fn(),
}));
jest.mock('../../appInsights/googlePlay.sync', () => ({ syncGooglePlay: jest.fn() }));
jest.mock('../../appInsights/appStore.sync', () => ({ syncAppStore: jest.fn() }));

import { AppInsightStateModel, AppInsightSyncLogModel } from '../../appInsights/appInsights.model';
import { readAppleInsightsConfig, readPlayInsightsConfig } from '../../appInsights/appInsights.config';
import { syncGooglePlay } from '../../appInsights/googlePlay.sync';
import { syncAppStore } from '../../appInsights/appStore.sync';
import {
  acquireLock,
  DAILY_MS,
  isDue,
  MANUAL_COOLDOWN_MS,
  RETRY_AFTER_FAILURE_MS,
  runStoreSync,
  safeMessage,
  scheduledSync,
  startManualSync,
  SYNC_STALE_MS,
} from '../../appInsights/appInsights.sync';

const m = (fn: unknown) => fn as jest.Mock;
const NOW = new Date('2026-11-22T10:00:00Z');
const PLAY = { account: { client_email: 'a@b', private_key: 'k' }, packageName: 'p', bucket: 'b12' };
const lean = (value: unknown) => ({ lean: jest.fn().mockResolvedValue(value) });
/** Lets the background sync a manual press starts settle. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  jest.clearAllMocks();
  m(readPlayInsightsConfig).mockResolvedValue({ config: PLAY, missing: [], problem: '' });
  m(readAppleInsightsConfig).mockResolvedValue({ config: null, missing: ['key_id'], problem: '' });
  m(AppInsightStateModel.updateOne).mockResolvedValue({});
  m(AppInsightStateModel.findOneAndUpdate).mockResolvedValue({ store: 'GOOGLE_PLAY' });
  m(AppInsightStateModel.findOne).mockReturnValue(lean(null));
  m(AppInsightSyncLogModel.create).mockResolvedValue({ _id: 'log1' });
  m(AppInsightSyncLogModel.updateOne).mockResolvedValue({});
});

describe('safeMessage', () => {
  it('removes key material and bearer tokens and keeps one bounded line', () => {
    const raw = 'Refused\n Bearer eyJhbGciOi.abc-DEF_1 for -----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY----- now';
    expect(safeMessage(new Error(raw))).toBe('Refused Bearer [removed] for [key removed] now');
    expect(safeMessage('x'.repeat(900))).toHaveLength(500);
    expect(safeMessage(new Error('   '))).toBe('Unknown error');
  });
});

describe('acquireLock', () => {
  it('takes the lock only when free or stale, in one conditional update', async () => {
    await expect(acquireLock('GOOGLE_PLAY', NOW)).resolves.toBe(true);
    const [filter, update] = m(AppInsightStateModel.findOneAndUpdate).mock.calls[0];
    expect(filter.store).toBe('GOOGLE_PLAY');
    expect(filter.$or).toContainEqual({ sync_started_at: { $lt: new Date(NOW.getTime() - SYNC_STALE_MS) } });
    expect(update.$set).toEqual({ syncing: true, sync_started_at: NOW, last_attempt_at: NOW });
  });

  it('answers false while another live sync holds it', async () => {
    m(AppInsightStateModel.findOneAndUpdate).mockResolvedValue(null);
    await expect(acquireLock('GOOGLE_PLAY', NOW)).resolves.toBe(false);
  });

  it('tolerates the race where another first sync created the state document', async () => {
    m(AppInsightStateModel.updateOne).mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 11000 }));
    await expect(acquireLock('APP_STORE', NOW)).resolves.toBe(true);
  });

  it('does not swallow any other database error', async () => {
    m(AppInsightStateModel.updateOne).mockRejectedValueOnce(new Error('db down'));
    await expect(acquireLock('APP_STORE', NOW)).rejects.toThrow('db down');
  });
});

describe('runStoreSync', () => {
  it('logs a success with what the sync read and spent, and releases the lock', async () => {
    m(syncGooglePlay).mockImplementation(async (_cfg, counter) => {
      counter.calls += 5;
      counter.retries += 1;
      return { read: 3, skipped: 9, rows: 120, message: 'Read 3 report file(s), 9 unchanged.' };
    });
    await runStoreSync('GOOGLE_PLAY', 'MANUAL', 'staff-1');
    expect(syncGooglePlay).toHaveBeenCalledWith(PLAY, expect.any(Object));
    expect(AppInsightSyncLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ store: 'GOOGLE_PLAY', trigger: 'MANUAL', outcome: 'RUNNING', by: 'staff-1' })
    );
    expect(m(AppInsightSyncLogModel.updateOne).mock.calls[0][1].$set).toMatchObject({
      outcome: 'SUCCESS',
      sources_read: 3,
      sources_skipped: 9,
      rows_written: 120,
      api_calls: 5,
      retries: 1,
    });
    expect(AppInsightStateModel.updateOne).toHaveBeenCalledWith(
      { store: 'GOOGLE_PLAY' },
      { $set: expect.objectContaining({ last_error: '' }) }
    );
    expect(AppInsightStateModel.updateOne).toHaveBeenLastCalledWith(
      { store: 'GOOGLE_PLAY' },
      { $set: { syncing: false, sync_started_at: null } }
    );
  });

  it('logs a failure with the reason, credential-free, keeps the last success, and still releases the lock', async () => {
    m(syncGooglePlay).mockRejectedValue(new Error('Google refused Bearer abc.def'));
    await runStoreSync('GOOGLE_PLAY', 'SCHEDULE');
    const logSet = m(AppInsightSyncLogModel.updateOne).mock.calls[0][1].$set;
    expect(logSet).toMatchObject({ outcome: 'FAILED', message: 'Google refused Bearer [removed]' });
    // The lock's own upsert is a $setOnInsert with no $set; only the $set writes matter here.
    const stateSets = m(AppInsightStateModel.updateOne)
      .mock.calls.map((call) => call[1].$set)
      .filter((set) => set !== undefined);
    expect(stateSets).toContainEqual({ last_error: 'Google refused Bearer [removed]' });
    expect(stateSets.some((set) => 'last_success_at' in set)).toBe(false);
    expect(stateSets.at(-1)).toEqual({ syncing: false, sync_started_at: null });
  });

  it('does nothing — no lock, no log — for a store that is not configured', async () => {
    await runStoreSync('APP_STORE', 'SCHEDULE');
    expect(AppInsightStateModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(AppInsightSyncLogModel.create).not.toHaveBeenCalled();
    expect(syncAppStore).not.toHaveBeenCalled();
  });

  it('does nothing while another sync holds the lock', async () => {
    m(AppInsightStateModel.findOneAndUpdate).mockResolvedValue(null);
    await runStoreSync('GOOGLE_PLAY', 'MANUAL');
    expect(AppInsightSyncLogModel.create).not.toHaveBeenCalled();
    expect(syncGooglePlay).not.toHaveBeenCalled();
  });
});

describe('startManualSync', () => {
  beforeEach(() => m(syncGooglePlay).mockResolvedValue({ read: 0, skipped: 0, rows: 0, message: 'ok' }));

  it('starts each configured store in the background and returns at once', async () => {
    await expect(startManualSync(['GOOGLE_PLAY', 'APP_STORE'], 'staff-1', NOW)).resolves.toBeUndefined();
    await flush();
    expect(syncGooglePlay).toHaveBeenCalledTimes(1);
    expect(syncAppStore).not.toHaveBeenCalled();
  });

  it('refuses with every reason when nothing could start', async () => {
    m(AppInsightStateModel.findOne).mockReturnValue(lean({ syncing: true, sync_started_at: new Date(NOW.getTime() - 60_000) }));
    await expect(startManualSync(['GOOGLE_PLAY', 'APP_STORE'], 'staff-1', NOW)).rejects.toThrow(
      'Nothing to sync: GOOGLE_PLAY is already syncing; APP_STORE is not configured.'
    );
  });

  it('refuses a press moments after the last attempt, saying how long to wait', async () => {
    m(AppInsightStateModel.findOne).mockReturnValue(
      lean({ syncing: false, sync_started_at: null, last_attempt_at: new Date(NOW.getTime() - 60_000) })
    );
    await expect(startManualSync(['GOOGLE_PLAY'], 'staff-1', NOW)).rejects.toMatchObject({
      message: expect.stringContaining('try again in 4 minute(s)'),
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('starts again once the cooldown is over, and treats a stale lock as free', async () => {
    m(AppInsightStateModel.findOne).mockReturnValue(
      lean({
        syncing: true,
        sync_started_at: new Date(NOW.getTime() - SYNC_STALE_MS - 1),
        last_attempt_at: new Date(NOW.getTime() - MANUAL_COOLDOWN_MS - 1),
      })
    );
    await expect(startManualSync(['GOOGLE_PLAY'], 'staff-1', NOW)).resolves.toBeUndefined();
  });
});

describe('isDue', () => {
  const at = (ms: number) => new Date(NOW.getTime() - ms);

  it('syncs a store that never ran, and retries a never-successful one only an hour after its last try', () => {
    expect(isDue(null, NOW)).toBe(true);
    expect(isDue({ last_success_at: null, last_attempt_at: at(10 * 60_000), last_error: 'x' }, NOW)).toBe(false);
    expect(isDue({ last_success_at: null, last_attempt_at: at(RETRY_AFTER_FAILURE_MS), last_error: 'x' }, NOW)).toBe(true);
  });

  it('syncs once a day after a success', () => {
    expect(isDue({ last_success_at: at(DAILY_MS - 1), last_attempt_at: at(DAILY_MS - 1), last_error: '' }, NOW)).toBe(false);
    expect(isDue({ last_success_at: at(DAILY_MS), last_attempt_at: at(DAILY_MS), last_error: '' }, NOW)).toBe(true);
  });

  it('after a failure past the daily mark, waits an hour between tries', () => {
    const old = at(DAILY_MS * 2);
    expect(isDue({ last_success_at: old, last_attempt_at: at(5 * 60_000), last_error: 'boom' }, NOW)).toBe(false);
    expect(isDue({ last_success_at: old, last_attempt_at: at(RETRY_AFTER_FAILURE_MS), last_error: 'boom' }, NOW)).toBe(true);
  });
});

describe('scheduledSync', () => {
  it('syncs each due store and skips the ones that are not', async () => {
    m(syncGooglePlay).mockResolvedValue({ read: 1, skipped: 0, rows: 1, message: 'ok' });
    m(AppInsightStateModel.findOne).mockImplementation(({ store }: { store: string }) =>
      lean(store === 'GOOGLE_PLAY' ? null : { last_success_at: new Date(NOW.getTime() - 60_000), last_attempt_at: null, last_error: '' })
    );
    await scheduledSync(NOW);
    expect(syncGooglePlay).toHaveBeenCalledTimes(1);
    expect(m(AppInsightSyncLogModel.create).mock.calls[0][0]).toMatchObject({ trigger: 'SCHEDULE' });
  });
});
