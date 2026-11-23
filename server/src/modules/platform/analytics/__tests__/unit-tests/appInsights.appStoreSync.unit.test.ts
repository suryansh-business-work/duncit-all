jest.mock('@modules/platform/appBuild/appStoreConnect.gateway', () => ({ ascToken: jest.fn(() => 'jwt') }));
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
jest.mock('../../appInsights/appInsights.model', () => ({
  AppInsightStateModel: { findOne: jest.fn(), updateOne: jest.fn() },
}));

import { gzipSync } from 'node:zlib';
import { ascToken } from '@modules/platform/appBuild/appStoreConnect.gateway';
import { newCounter, storeBytes, storeJson, StoreHttpError } from '../../appInsights/appInsights.http';
import { markSource, readSources, replaceMetrics } from '../../appInsights/appInsights.store';
import { AppInsightStateModel } from '../../appInsights/appInsights.model';
import { ascClient, syncAppStore, tokenSource } from '../../appInsights/appStore.sync';
import { reviewsFromDay } from '../../appInsights/appStore.reviews';

const m = (fn: unknown) => fn as jest.Mock;
const CFG = { creds: { issuerId: 'i', keyId: 'k', privateKey: 'p' }, bundleId: 'com.duncit.mobile' };
const NOW = new Date('2026-11-22T10:00:00Z');
const API = 'https://api.appstoreconnect.apple.com/v1';
const lean = (value: unknown) => ({ lean: jest.fn().mockResolvedValue(value) });

type Route = { method: string; path: string; body?: unknown };
let routes: Record<string, unknown>;
const calls: Route[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  calls.length = 0;
  m(readSources).mockResolvedValue(new Map([['seen', '']]));
  m(replaceMetrics).mockResolvedValue(3);
  m(AppInsightStateModel.findOne).mockReturnValue(lean(null));
  m(AppInsightStateModel.updateOne).mockResolvedValue({});
  routes = {
    'GET /apps?filter%5BbundleId%5D=com.duncit.mobile&limit=1': { data: [{ id: 'app1' }] },
    'GET /apps/app1/analyticsReportRequests?filter[accessType]=ONGOING&limit=50': { data: [] },
    'POST /analyticsReportRequests': { data: { id: 'req1' } },
    'GET /analyticsReportRequests/req1/reports?limit=200': {
      data: [
        { id: 'rep1', attributes: { name: 'App Sessions Standard' } },
        { id: 'rep2', attributes: { name: 'App Store Discovery and Engagement Standard' } },
      ],
    },
    'GET /analyticsReports/rep1/instances?filter[granularity]=DAILY&limit=200': {
      data: [
        { id: 'inst1', attributes: { processingDate: '2026-11-20' } },
        { id: 'old', attributes: { processingDate: '2024-01-01' } },
        { id: 'seen', attributes: { processingDate: '2026-11-19' } },
      ],
    },
    'GET /analyticsReportInstances/inst1/segments?limit=200': {
      data: [{ attributes: { url: 'https://segments.example.test/1.gz' } }, { attributes: { url: 'http://insecure.test/2' } }],
    },
  };
  m(storeJson).mockImplementation(async ({ url, init }: { url: string; init?: RequestInit }) => {
    const path = url.replace(API, '');
    const method = init?.method ?? 'GET';
    calls.push({ method, path, body: init?.body });
    if (path.startsWith('/apps/app1/customerReviews')) return { data: [] };
    const key = `${method} ${path}`;
    if (!(key in routes)) throw new Error(`unexpected ${key}`);
    return routes[key];
  });
  m(storeBytes).mockResolvedValue(
    new Uint8Array(gzipSync(Buffer.from('Date\tApp Version\tTerritory\tSessions\tUnique Devices\n2026-11-19\t1.81\tIN\t40\t12\n')))
  );
});

describe('tokenSource', () => {
  it('signs once, then again only once the token is getting old', () => {
    let clock = 0;
    const token = tokenSource(CFG, () => clock);
    token();
    token();
    expect(ascToken).toHaveBeenCalledTimes(1);
    clock = 9 * 60_000;
    token();
    expect(ascToken).toHaveBeenCalledTimes(2);
  });
});

describe('ascClient', () => {
  it('refuses to follow a link outside the App Store Connect API', async () => {
    const api = ascClient(() => 'jwt', newCounter());
    await expect(api.get('https://evil.example.test/v1/apps')).rejects.toThrow('outside its API');
  });

  it('follows links.next across pages', async () => {
    m(storeJson).mockReset();
    m(storeJson)
      .mockResolvedValueOnce({ data: [{ id: 'a' }], links: { next: `${API}/x?cursor=2` } })
      .mockResolvedValueOnce({ data: [{ id: 'b' }] });
    const api = ascClient(() => 'jwt', newCounter());
    await expect(api.all('/x')).resolves.toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(m(storeJson).mock.calls[1][0].url).toBe(`${API}/x?cursor=2`);
  });
});

describe('syncAppStore', () => {
  it('makes the ONGOING report request, reads each new instance once over every dimension, and remembers it', async () => {
    const result = await syncAppStore(CFG, newCounter(), NOW);

    const post = calls.find((c) => c.method === 'POST');
    expect(JSON.parse(String(post?.body))).toEqual({
      data: {
        type: 'analyticsReportRequests',
        attributes: { accessType: 'ONGOING' },
        relationships: { app: { data: { type: 'apps', id: 'app1' } } },
      },
    });
    expect(AppInsightStateModel.updateOne).toHaveBeenCalledWith(
      { store: 'APP_STORE' },
      { $set: { app_id: 'app1', report_request_id: 'req1' } }
    );
    // Only the secure segment URL is downloaded, and only for the unread, in-window instance.
    expect(storeBytes).toHaveBeenCalledTimes(1);
    expect(m(storeBytes).mock.calls[0][0].url).toBe('https://segments.example.test/1.gz');
    const scopes = m(replaceMetrics).mock.calls.map((c) => c[0]);
    expect(scopes.filter((s) => s.owns.includes('sessions')).map((s) => s.dimension)).toEqual(['TOTAL', 'COUNTRY', 'VERSION']);
    expect(scopes[0]).toMatchObject({ store: 'APP_STORE', fromDay: '2026-11-19', toDay: '2026-11-19' });
    expect(markSource).toHaveBeenCalledWith('APP_STORE', 'inst1', '');
    expect(markSource).not.toHaveBeenCalledWith('APP_STORE', 'seen', '');
    expect(result.message).toMatch(/Apple is preparing the first analytics reports/);
    expect(result.skipped).toBe(1);
  });

  it('reuses a live request and the app id it already knows, skipping one Apple stopped', async () => {
    m(AppInsightStateModel.findOne).mockReturnValue(lean({ app_id: 'app1', report_request_id: 'req1', reviews_through: '2026-11-20' }));
    routes['GET /apps/app1/analyticsReportRequests?filter[accessType]=ONGOING&limit=50'] = {
      data: [
        { id: 'stopped', attributes: { stoppedDueToInactivity: true } },
        { id: 'req1', attributes: { stoppedDueToInactivity: false } },
      ],
    };
    const result = await syncAppStore(CFG, newCounter(), NOW);
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
    expect(calls.some((c) => c.path.startsWith('/apps?'))).toBe(false);
    expect(result.message).toMatch(/^Read 1 report instance\(s\), 1 unchanged/);
  });

  it('says an Admin key is needed when Apple refuses to create the request', async () => {
    m(storeJson).mockImplementationOnce(async () => ({ data: [{ id: 'app1' }] }));
    m(storeJson).mockImplementationOnce(async () => ({ data: [] }));
    m(storeJson).mockImplementationOnce(async () => {
      throw new StoreHttpError(403, 'App Store Connect refused the request (HTTP 403): forbidden');
    });
    await expect(syncAppStore(CFG, newCounter(), NOW)).rejects.toThrow(/Admin role/);
  });

  it('fails clearly when App Store Connect has no app with the bundle ID', async () => {
    routes['GET /apps?filter%5BbundleId%5D=com.duncit.mobile&limit=1'] = { data: [] };
    await expect(syncAppStore(CFG, newCounter(), NOW)).rejects.toThrow('has no app with bundle ID com.duncit.mobile');
  });
});

describe('reviewsFromDay', () => {
  it('re-reads three days before the last complete day, or 400 days on a first run', () => {
    expect(reviewsFromDay('2026-11-20', NOW)).toBe('2026-11-17');
    expect(reviewsFromDay('', NOW)).toBe('2025-10-18');
  });
});
