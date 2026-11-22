jest.mock('../../appInsights/appInsights.status', () => ({ appInsightsStatus: jest.fn().mockResolvedValue([]) }));
jest.mock('../../appInsights/appInsights.read', () => ({
  appInsightsDaily: jest.fn().mockResolvedValue([]),
  appInsightsSyncLogs: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../appInsights/appInsights.sync', () => ({ startManualSync: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@modules/ai/askBot/askBot.links', () => ({ callerEnvironment: () => 'STAGING' }));

import type { GraphQLContext } from '@context';
import { appInsightsResolvers } from '../../appInsights/appInsights.resolver';
import { appInsightsStatus } from '../../appInsights/appInsights.status';
import { appInsightsDaily, appInsightsSyncLogs } from '../../appInsights/appInsights.read';
import { startManualSync } from '../../appInsights/appInsights.sync';

const ctx = (roles: string[] | null) =>
  ({ user: roles ? { id: 'staff-1', roles } : null, req: {} }) as unknown as GraphQLContext;
const { Query, Mutation } = appInsightsResolvers;

beforeEach(() => jest.clearAllMocks());

describe('App Insights authorization', () => {
  const calls = [
    () => Query.appInsightsStatus(null, {}, ctx(['HOST'])),
    () => Query.appInsightsSyncLogs(null, {}, ctx(['HOST'])),
    () => Query.appInsightsDaily(null, { store: 'GOOGLE_PLAY', from: '2026-05-01', to: '2026-05-02' }, ctx(['HOST'])),
    () => Mutation.syncAppInsights(null, {}, ctx(['HOST'])),
  ];

  it.each(calls.map((call, i) => [i, call]))('refuses a member without an Analytics role (%i) before doing anything', async (_i, call) => {
    await expect(Promise.resolve().then(call)).rejects.toThrow();
    expect(appInsightsStatus).not.toHaveBeenCalled();
    expect(appInsightsDaily).not.toHaveBeenCalled();
    expect(appInsightsSyncLogs).not.toHaveBeenCalled();
    expect(startManualSync).not.toHaveBeenCalled();
  });

  it('refuses a signed-out caller', async () => {
    await expect(Promise.resolve().then(() => Query.appInsightsStatus(null, {}, ctx(null)))).rejects.toThrow();
  });
});

describe('App Insights for Analytics staff', () => {
  it('reads the status for the caller environment', async () => {
    await Query.appInsightsStatus(null, {}, ctx(['ANALYTICS_MANAGER']));
    expect(appInsightsStatus).toHaveBeenCalledWith('STAGING');
  });

  it('passes the log and daily arguments through', async () => {
    await Query.appInsightsSyncLogs(null, { store: 'APP_STORE', limit: 10 }, ctx(['SUPER_ADMIN']));
    expect(appInsightsSyncLogs).toHaveBeenCalledWith('APP_STORE', 10);
    const args = { store: 'GOOGLE_PLAY' as const, from: '2026-05-01', to: '2026-05-31', dimension: 'COUNTRY' as const };
    await Query.appInsightsDaily(null, args, ctx(['ANALYTICS_MANAGER']));
    expect(appInsightsDaily).toHaveBeenCalledWith(args);
  });

  it('syncs one store, or both, recording who asked, and answers with the integrations', async () => {
    await Mutation.syncAppInsights(null, { store: 'APP_STORE' }, ctx(['ANALYTICS_MANAGER']));
    expect(startManualSync).toHaveBeenLastCalledWith(['APP_STORE'], 'staff-1');
    await Mutation.syncAppInsights(null, {}, ctx(['ANALYTICS_MANAGER']));
    expect(startManualSync).toHaveBeenLastCalledWith(['GOOGLE_PLAY', 'APP_STORE'], 'staff-1');
    expect(appInsightsStatus).toHaveBeenCalledTimes(2);
  });
});
