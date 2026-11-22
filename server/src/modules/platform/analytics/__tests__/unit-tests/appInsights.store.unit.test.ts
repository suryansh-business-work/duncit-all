jest.mock('../../appInsights/appInsights.model', () => ({
  AppInsightDayModel: { updateMany: jest.fn(), bulkWrite: jest.fn() },
  AppInsightSourceModel: { find: jest.fn(), updateOne: jest.fn() },
  AppInsightStateModel: { updateOne: jest.fn() },
}));
jest.mock('@utils/googleServiceAccount', () => ({ serviceAccountToken: jest.fn() }));
jest.mock('../../appInsights/appInsights.http', () => ({
  ...jest.requireActual('../../appInsights/appInsights.http'),
  storeJson: jest.fn(),
}));

import { serviceAccountToken } from '@utils/googleServiceAccount';
import { AppInsightDayModel, AppInsightSourceModel, AppInsightStateModel } from '../../appInsights/appInsights.model';
import { storeJson } from '../../appInsights/appInsights.http';
import { markSource, readSources, replaceMetrics } from '../../appInsights/appInsights.store';
import { syncAppleReviews } from '../../appInsights/appStore.reviews';
import { probePlayReportsBucket } from '../../appInsights/googlePlay.probe';
import type { AscClient } from '../../appInsights/appStore.sync';

const m = (fn: unknown) => fn as jest.Mock;
const ACCOUNT = { client_email: 'insights@proj.iam.gserviceaccount.com', private_key: 'k' };

beforeEach(() => jest.clearAllMocks());

describe('replaceMetrics', () => {
  const scope = {
    store: 'GOOGLE_PLAY' as const,
    dimension: 'COUNTRY' as const,
    owns: ['new_installs', 'uninstalls'],
    fromDay: '2026-05-01',
    toDay: '2026-05-31',
  };

  it('clears the owned metrics over the scope first, then sets only owned metrics of in-scope rows', async () => {
    const written = await replaceMetrics(scope, [
      { day: '2026-05-02', dimension: 'COUNTRY', key: 'IN', metrics: { new_installs: 3, active_devices: 99 } },
      { day: '2026-06-01', dimension: 'COUNTRY', key: 'IN', metrics: { new_installs: 1 } },
      { day: '2026-05-02', dimension: 'TOTAL', key: '', metrics: { new_installs: 3 } },
    ]);
    expect(AppInsightDayModel.updateMany).toHaveBeenCalledWith(
      { store: 'GOOGLE_PLAY', dimension: 'COUNTRY', day: { $gte: '2026-05-01', $lte: '2026-05-31' } },
      { $unset: { 'm.new_installs': '', 'm.uninstalls': '' } }
    );
    const ops = m(AppInsightDayModel.bulkWrite).mock.calls[0][0];
    expect(ops).toHaveLength(1);
    expect(ops[0].updateOne.filter).toEqual({ store: 'GOOGLE_PLAY', dimension: 'COUNTRY', day: '2026-05-02', key: 'IN' });
    expect(ops[0].updateOne.update.$set).toEqual({ updated_at: expect.any(Date), 'm.new_installs': 3 });
    expect(ops[0].updateOne.upsert).toBe(true);
    expect(written).toBe(1);
  });

  it('still clears the scope when the report is empty — a dropped slice does not linger', async () => {
    await expect(replaceMetrics(scope, [])).resolves.toBe(0);
    expect(AppInsightDayModel.updateMany).toHaveBeenCalled();
    expect(AppInsightDayModel.bulkWrite).not.toHaveBeenCalled();
  });

  it('writes in batches', async () => {
    const rows = Array.from({ length: 1201 }, (_, i) => ({
      day: '2026-05-03',
      dimension: 'COUNTRY' as const,
      key: `K${i}`,
      metrics: { new_installs: i },
    }));
    await replaceMetrics(scope, rows);
    expect(m(AppInsightDayModel.bulkWrite).mock.calls.map((c) => c[0].length)).toEqual([500, 500, 201]);
  });
});

describe('sources', () => {
  it('reads the refs already read with their versions, and records a new one', async () => {
    m(AppInsightSourceModel.find).mockReturnValue({
      select: () => ({ lean: jest.fn().mockResolvedValue([{ ref: 'a.csv', version: '3' }]) }),
    });
    await expect(readSources('GOOGLE_PLAY')).resolves.toEqual(new Map([['a.csv', '3']]));
    await markSource('GOOGLE_PLAY', 'a.csv', '4');
    expect(AppInsightSourceModel.updateOne).toHaveBeenCalledWith(
      { store: 'GOOGLE_PLAY', ref: 'a.csv' },
      { $set: { version: '4', read_at: expect.any(Date) } },
      { upsert: true }
    );
  });
});

describe('syncAppleReviews', () => {
  it('pages newest-first until it passes the first day it must read, and rewrites that whole span', async () => {
    const get = jest
      .fn()
      .mockResolvedValueOnce({
        data: [
          { attributes: { rating: 5, createdDate: '2026-11-21T10:00:00-08:00' } },
          { attributes: { rating: 3, createdDate: '2026-11-18T10:00:00-08:00' } },
        ],
        links: { next: 'https://api.appstoreconnect.apple.com/v1/next' },
      })
      .mockResolvedValueOnce({
        data: [
          { attributes: { rating: 1, createdDate: '2026-11-17T10:00:00-08:00' } },
          { attributes: { rating: 4, createdDate: '2026-11-10T10:00:00-08:00' } },
        ],
        links: { next: 'https://api.appstoreconnect.apple.com/v1/never' },
      });
    m(AppInsightDayModel.updateMany).mockResolvedValue({});
    m(AppInsightDayModel.bulkWrite).mockResolvedValue({});
    const api = { get } as unknown as AscClient;

    const result = await syncAppleReviews(api, 'app1', '2026-11-20', new Date('2026-11-22T10:00:00Z'));

    expect(get).toHaveBeenCalledTimes(2);
    expect(String(get.mock.calls[0][0])).toContain('/apps/app1/customerReviews?sort=-createdDate');
    expect(result).toEqual({ rows: 3, reviews: 3, pages: 2 });
    expect(AppInsightDayModel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ store: 'APP_STORE', dimension: 'TOTAL', day: { $gte: '2026-11-17', $lte: '2026-11-22' } }),
      expect.anything()
    );
    expect(AppInsightStateModel.updateOne).toHaveBeenCalledWith({ store: 'APP_STORE' }, { $set: { reviews_through: '2026-11-22' } });
  });
});

describe('probePlayReportsBucket', () => {
  it('says nothing when no bucket is set', async () => {
    await expect(probePlayReportsBucket(ACCOUNT, '  ')).resolves.toBeNull();
  });

  it('refuses a value that is not a bucket without calling Google', async () => {
    await expect(probePlayReportsBucket(ACCOUNT, 'not a bucket')).resolves.toMatchObject({ ok: false });
    expect(serviceAccountToken).not.toHaveBeenCalled();
  });

  it('confirms read access with one listing call', async () => {
    m(serviceAccountToken).mockResolvedValue('tok');
    m(storeJson).mockResolvedValue({ items: [] });
    await expect(probePlayReportsBucket(ACCOUNT, 'gs://pubsite_prod_rev_1/')).resolves.toEqual({
      ok: true,
      detail: 'App Insights can read the reports bucket pubsite_prod_rev_1.',
    });
    expect(m(storeJson).mock.calls[0][0].url).toContain('/b/pubsite_prod_rev_1/o?maxResults=1');
  });

  it('names the permission to grant when Google refuses', async () => {
    m(serviceAccountToken).mockResolvedValue('tok');
    m(storeJson).mockRejectedValue(new Error('HTTP 403: denied'));
    const probe = await probePlayReportsBucket(ACCOUNT, 'pubsite_prod_rev_1');
    expect(probe?.ok).toBe(false);
    expect(probe?.detail).toContain('insights@proj.iam.gserviceaccount.com');
    expect(probe?.detail).toContain('download bulk reports');
  });
});
