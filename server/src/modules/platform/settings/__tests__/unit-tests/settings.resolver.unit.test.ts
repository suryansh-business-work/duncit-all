import { settingsResolvers } from '../../settings.resolver';
import { settingsService } from '../../settings.service';
import { makeContext } from '@test/harness';

jest.mock('../../settings.service', () => ({
  settingsService: {
    getAppSettings: jest.fn(), getPublicAppSettings: jest.fn(), getPublicClientConfig: jest.fn(), listFlags: jest.fn(), flagsTable: jest.fn(),
    getFlag: jest.fn(), listPublicFlags: jest.fn(), getBranding: jest.fn(), getAppVersionInfo: jest.fn(), updateAppSettings: jest.fn(),
    createFlag: jest.fn(), updateFlag: jest.fn(), setFlagEnabled: jest.fn(), deleteFlag: jest.fn(), importFlags: jest.fn(), updateBranding: jest.fn(),
    updatePodShopSlider: jest.fn(), updateOccasionalIcons: jest.fn(),
  },
}));

const svc = settingsService as unknown as Record<string, jest.Mock>;
const Q = settingsResolvers.Query as Record<string, (...a: any[]) => any>;
const M = settingsResolvers.Mutation as Record<string, (...a: any[]) => any>;
const tech = makeContext({ id: 't1', roles: ['TECH_MANAGER'] });
const support = makeContext({ id: 's1', roles: ['SUPPORT_USER'] });
const products = makeContext({ id: 'p1', roles: ['PRODUCTS_MANAGER'] });
const member = makeContext({ id: 'm1', roles: ['USER'] });

beforeEach(() => jest.clearAllMocks());

describe('reads', () => {
  it('serve the public ones to anyone', async () => {
    await Q.publicAppSettings();
    await Q.publicClientConfig();
    await Q.publicFeatureFlags();
    await Q.branding();
    await Q.appVersionInfo();
    for (const name of ['getPublicAppSettings', 'getPublicClientConfig', 'listPublicFlags', 'getBranding', 'getAppVersionInfo']) expect(svc[name]).toHaveBeenCalledTimes(1);
  });

  it('serve the admin ones to the console roles, support staff included', async () => {
    await Q.appSettings({}, {}, support);
    await Q.featureFlags({}, {}, support);
    await Q.featureFlagsTable({}, { query: { page: 2 } }, tech);
    await Q.featureFlag({}, { key: 'k' }, support);
    expect(svc.getAppSettings).toHaveBeenCalledTimes(1);
    expect(svc.listFlags).toHaveBeenCalledTimes(1);
    expect(svc.flagsTable).toHaveBeenCalledWith({ page: 2 });
    expect(svc.getFlag).toHaveBeenCalledWith('k');
  });

  it('refuse a member and a signed-out caller', async () => {
    for (const name of ['appSettings', 'featureFlags', 'featureFlagsTable', 'featureFlag']) {
      await expect(Q[name]({}, { key: 'k' }, member)).rejects.toThrow(/access denied/i);
      await expect(Q[name]({}, { key: 'k' }, makeContext(null))).rejects.toThrow();
    }
  });
});

describe('writes', () => {
  it('reach their services for the platform owners', async () => {
    await M.updateAppSettings({}, { input: { a: 1 } }, tech);
    await M.createFeatureFlag({}, { input: { key: 'k' } }, tech);
    await M.updateFeatureFlag({}, { flag_id: 'f1', input: { name: 'n' } }, tech);
    await M.setFeatureFlag({}, { flag_id: 'f1', enabled: true }, tech);
    await M.deleteFeatureFlag({}, { flag_id: 'f1' }, tech);
    await M.importFeatureFlags({}, { flags: [{ key: 'k' }] }, tech);
    await M.updateBranding({}, { input: { app_name: 'x' } }, tech);
    await M.updateOccasionalIcons({}, { input: [{ slug: 's' }] }, tech);
    expect(svc.updateAppSettings).toHaveBeenCalledWith({ a: 1 });
    expect(svc.createFlag).toHaveBeenCalledWith({ key: 'k' });
    expect(svc.updateFlag).toHaveBeenCalledWith('f1', { name: 'n' });
    expect(svc.setFlagEnabled).toHaveBeenCalledWith('f1', true);
    expect(svc.deleteFlag).toHaveBeenCalledWith('f1');
    expect(svc.importFlags).toHaveBeenCalledWith([{ key: 'k' }]);
    expect(svc.updateBranding).toHaveBeenCalledWith({ app_name: 'x' });
    expect(svc.updateOccasionalIcons).toHaveBeenCalledWith([{ slug: 's' }]);
  });

  it('let the Products console curate the pod shop slider, and nothing else', async () => {
    await M.updatePodShopSlider({}, { input: [{ url: 'u' }] }, products);
    expect(svc.updatePodShopSlider).toHaveBeenCalledWith([{ url: 'u' }]);
    await expect(M.updateBranding({}, { input: {} }, products)).rejects.toThrow(/access denied/i);
    await expect(M.updatePodShopSlider({}, { input: [] }, member)).rejects.toThrow(/access denied/i);
  });

  it('refuse support staff, who may read settings but not change them', async () => {
    for (const [name, args] of [['updateAppSettings', { input: {} }], ['createFeatureFlag', { input: {} }], ['updateFeatureFlag', { flag_id: 'f', input: {} }], ['setFeatureFlag', { flag_id: 'f', enabled: true }], ['deleteFeatureFlag', { flag_id: 'f' }], ['importFeatureFlags', { flags: [] }], ['updateOccasionalIcons', { input: [] }]] as const) {
      await expect(M[name]({}, args, support)).rejects.toThrow(/access denied/i);
    }
    expect(svc.updateAppSettings).not.toHaveBeenCalled();
  });
});
