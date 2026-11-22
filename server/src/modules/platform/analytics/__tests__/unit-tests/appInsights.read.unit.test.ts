jest.mock('../../appInsights/appInsights.model', () => ({
  AppInsightDayModel: { find: jest.fn() },
  AppInsightSyncLogModel: { find: jest.fn() },
}));

import { Types } from 'mongoose';
import { AppInsightDayModel, AppInsightSyncLogModel } from '../../appInsights/appInsights.model';
import {
  appInsightsDaily,
  appInsightsSyncLogs,
  checkRange,
  DAILY_METRICS,
  MAX_DAILY_ROWS,
} from '../../appInsights/appInsights.read';

const m = (fn: unknown) => fn as jest.Mock;

/** find().sort().limit().lean() resolving to `rows`, with the calls kept for assertions. */
function query(rows: unknown[]) {
  const q = { sort: jest.fn(), limit: jest.fn(), lean: jest.fn().mockResolvedValue(rows) };
  q.sort.mockReturnValue(q);
  q.limit.mockReturnValue(q);
  return q;
}

describe('checkRange', () => {
  it('accepts a year at most, in order, written yyyy-MM-dd', () => {
    expect(() => checkRange('2026-01-01', '2026-12-31')).not.toThrow();
    expect(() => checkRange('2026-05-01', '2026-05-01')).not.toThrow();
  });

  it('refuses a malformed, reversed or over-long range as bad input', () => {
    expect(() => checkRange('01/05/2026', '2026-05-02')).toThrow('Dates must be written yyyy-MM-dd.');
    expect(() => checkRange('2026-05-02', '2026-05-01')).toThrow('on or before');
    expect(() => checkRange('2025-01-01', '2026-01-02')).toThrow('at most a year');
  });
});

describe('appInsightsDaily', () => {
  it('reads one store and slice over the range, every metric a column, unreported metrics null', async () => {
    const q = query([{ _id: new Types.ObjectId(), store: 'GOOGLE_PLAY', day: '2026-05-01', dimension: 'TOTAL', key: '', m: { new_installs: 4 } }]);
    m(AppInsightDayModel.find).mockReturnValue(q);
    const [row] = await appInsightsDaily({ store: 'GOOGLE_PLAY', from: '2026-05-01', to: '2026-05-31' });
    expect(AppInsightDayModel.find).toHaveBeenCalledWith({
      store: 'GOOGLE_PLAY',
      dimension: 'TOTAL',
      day: { $gte: '2026-05-01', $lte: '2026-05-31' },
    });
    expect(q.limit).toHaveBeenCalledWith(MAX_DAILY_ROWS);
    expect(row).toMatchObject({ store: 'GOOGLE_PLAY', day: '2026-05-01', new_installs: 4, first_downloads: null, reviews_5: null });
    expect(Object.keys(row ?? {})).toEqual(expect.arrayContaining([...DAILY_METRICS]));
  });

  it('refuses a bad range before touching the database', async () => {
    await expect(appInsightsDaily({ store: 'APP_STORE', from: '2026-05-02', to: '2026-05-01' })).rejects.toThrow();
    expect(AppInsightDayModel.find).not.toHaveBeenCalledWith(expect.objectContaining({ store: 'APP_STORE' }));
  });

  it('lists every metric name once, both stores together', () => {
    expect(new Set(DAILY_METRICS).size).toBe(DAILY_METRICS.length);
    expect(DAILY_METRICS).toEqual(expect.arrayContaining(['new_installs', 'first_downloads', 'anrs', 'sessions', 'reviews_1']));
  });
});

describe('appInsightsSyncLogs', () => {
  const started = new Date('2026-11-22T09:00:00Z');

  it('lists the newest syncs with their duration, the limit clamped to 1-200', async () => {
    const q = query([
      {
        _id: new Types.ObjectId(),
        store: 'APP_STORE',
        trigger: 'MANUAL',
        outcome: 'SUCCESS',
        started_at: started,
        finished_at: new Date(started.getTime() + 4200),
        sources_read: 2,
        sources_skipped: 5,
        rows_written: 30,
        api_calls: 12,
        retries: 1,
        message: 'Read 2 report instance(s)',
      },
      { _id: new Types.ObjectId(), store: 'GOOGLE_PLAY', trigger: 'SCHEDULE', outcome: 'RUNNING', started_at: started, finished_at: null },
    ]);
    m(AppInsightSyncLogModel.find).mockReturnValue(q);
    const rows = await appInsightsSyncLogs(null, 5000);
    expect(AppInsightSyncLogModel.find).toHaveBeenCalledWith({});
    expect(q.limit).toHaveBeenCalledWith(200);
    expect(rows[0]).toMatchObject({ store: 'APP_STORE', duration_ms: 4200, started_at: started.toISOString() });
    expect(rows[1]).toMatchObject({ finished_at: null, duration_ms: null });
  });

  it('narrows to one store and reads at least one row', async () => {
    const q = query([]);
    m(AppInsightSyncLogModel.find).mockReturnValue(q);
    await appInsightsSyncLogs('GOOGLE_PLAY', 0);
    expect(AppInsightSyncLogModel.find).toHaveBeenCalledWith({ store: 'GOOGLE_PLAY' });
    expect(q.limit).toHaveBeenCalledWith(1);
  });
});
