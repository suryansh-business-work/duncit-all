jest.mock('@utils/googleServiceAccount', () => ({ serviceAccountToken: jest.fn().mockResolvedValue('tok') }));
jest.mock('../../appInsights/appInsights.http', () => ({
  ...jest.requireActual('../../appInsights/appInsights.http'),
  storeJson: jest.fn(),
  storeBytes: jest.fn(),
}));
jest.mock('../../appInsights/appInsights.store', () => ({
  replaceMetrics: jest.fn(),
  readSources: jest.fn(),
  markSource: jest.fn(),
}));

import { serviceAccountToken } from '@utils/googleServiceAccount';
import { newCounter, storeBytes, storeJson, StoreHttpError } from '../../appInsights/appInsights.http';
import { markSource, readSources, replaceMetrics } from '../../appInsights/appInsights.store';
import { BACKFILL_MONTHS, monthsBefore, pickPlayFiles, syncGooglePlay } from '../../appInsights/googlePlay.sync';

const m = (fn: unknown) => fn as jest.Mock;
const PKG = 'com.duncit.mobile';
const CFG = { account: { client_email: 'insights@proj.iam.gserviceaccount.com', private_key: 'k' }, packageName: PKG, bucket: 'pubsite_prod_rev_1' };
const NOW = new Date('2026-11-22T10:00:00Z');
const utf16le = (text: string) => new Uint8Array([0xff, 0xfe, ...Buffer.from(text, 'utf16le')]);

beforeEach(() => {
  jest.clearAllMocks();
  m(readSources).mockResolvedValue(new Map());
  m(replaceMetrics).mockResolvedValue(2);
  m(markSource).mockResolvedValue(undefined);
});

describe('monthsBefore / pickPlayFiles', () => {
  it('counts whole months back across a year boundary', () => {
    expect(monthsBefore(NOW, 0)).toBe('202611');
    expect(monthsBefore(NOW, 11)).toBe('202512');
    expect(monthsBefore(NOW, BACKFILL_MONTHS)).toBe('202410');
  });

  it('keeps known files inside the window, oldest month first, and drops the rest', () => {
    const files = pickPlayFiles(
      [
        { name: `stats/installs/installs_${PKG}_202611_overview.csv`, generation: '2' },
        { name: `stats/installs/installs_${PKG}_202301_overview.csv`, generation: '1' },
        { name: `stats/installs/installs_${PKG}_202610_country.csv`, generation: '1' },
        { name: `stats/installs/installs_${PKG}_202610_carrier.csv`, generation: '1' },
      ],
      PKG,
      '202410'
    );
    expect(files.map((f) => `${f.month}:${f.kind.id}`)).toEqual(['202610:installs_country', '202611:installs_overview']);
  });
});

describe('syncGooglePlay', () => {
  const overview = `stats/installs/installs_${PKG}_202611_overview.csv`;
  const reviews = `reviews/reviews_${PKG}_202611.csv`;
  const unchanged = `stats/crashes/crashes_${PKG}_202610_overview.csv`;

  beforeEach(() => {
    m(storeJson).mockImplementation(async ({ url }: { url: string }) => {
      const prefix = new URL(url).searchParams.get('prefix');
      if (prefix === `stats/installs/installs_${PKG}_`) return { items: [{ name: overview, generation: '7' }] };
      if (prefix === `stats/crashes/crashes_${PKG}_`) return { items: [{ name: unchanged, generation: '3' }] };
      if (prefix === `reviews/reviews_${PKG}_`) return { items: [{ name: reviews, generation: '1' }] };
      return {};
    });
    m(storeBytes).mockImplementation(async ({ url }: { url: string }) =>
      url.includes('reviews')
        ? utf16le('Review Submit Date and Time,Star Rating\n2026-11-02T10:00:00Z,5')
        : utf16le('Date,Daily User Installs\n2026-11-01,9')
    );
  });

  it('reads only the files Google rewrote since the last sync, replacing each month it owns', async () => {
    m(readSources).mockResolvedValue(new Map([[unchanged, '3']]));
    const counter = newCounter();
    const result = await syncGooglePlay(CFG, counter, NOW);

    expect(serviceAccountToken).toHaveBeenCalledWith(CFG.account, 'https://www.googleapis.com/auth/devstorage.read_only');
    expect(storeBytes).toHaveBeenCalledTimes(2);
    expect(m(storeBytes).mock.calls.map((c) => c[0].url)).toContain(
      `https://storage.googleapis.com/storage/v1/b/pubsite_prod_rev_1/o/${encodeURIComponent(overview)}?alt=media`
    );
    expect(replaceMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ store: 'GOOGLE_PLAY', dimension: 'TOTAL', fromDay: '2026-11-01', toDay: '2026-11-31' }),
      [{ day: '2026-11-01', dimension: 'TOTAL', key: '', metrics: { new_installs: 9 } }]
    );
    expect(replaceMetrics).toHaveBeenCalledWith(expect.objectContaining({ owns: expect.arrayContaining(['reviews_5']) }), [
      { day: '2026-11-02', dimension: 'TOTAL', key: '', metrics: { reviews_5: 1 } },
    ]);
    expect(markSource).toHaveBeenCalledWith('GOOGLE_PLAY', overview, '7');
    expect(markSource).not.toHaveBeenCalledWith('GOOGLE_PLAY', unchanged, '3');
    expect(result).toEqual({ read: 2, skipped: 1, rows: 4, message: 'Read 2 report file(s), 1 unchanged.' });
    expect(counter.calls).toBeGreaterThanOrEqual(1);
  });

  it('follows the listing across pages', async () => {
    m(storeJson).mockReset();
    m(storeJson)
      .mockResolvedValueOnce({ items: [{ name: overview, generation: '1' }], nextPageToken: 'p2' })
      .mockResolvedValue({ items: [] });
    await syncGooglePlay(CFG, newCounter(), NOW);
    const pageUrls = m(storeJson).mock.calls.map((c) => c[0].url as string);
    expect(pageUrls.some((u) => u.includes('pageToken=p2'))).toBe(true);
  });

  it('says so when the bucket has no report files yet', async () => {
    m(storeJson).mockResolvedValue({ items: [] });
    const result = await syncGooglePlay(CFG, newCounter(), NOW);
    expect(result).toMatchObject({ read: 0, skipped: 0, rows: 0 });
    expect(result.message).toMatch(/No report files in the bucket yet/);
  });

  it('turns a 403 on the bucket into the two settings to check', async () => {
    m(storeJson).mockRejectedValue(new StoreHttpError(403, 'Google Play reports refused the request (HTTP 403): denied'));
    await expect(syncGooglePlay(CFG, newCounter(), NOW)).rejects.toThrow(
      /pubsite_prod_rev_1.*insights@proj\.iam\.gserviceaccount\.com.*download bulk reports/
    );
  });

  it('passes any other failure on unchanged', async () => {
    const boom = new StoreHttpError(500, 'busy');
    m(storeJson).mockRejectedValue(boom);
    await expect(syncGooglePlay(CFG, newCounter(), NOW)).rejects.toBe(boom);
  });
});
