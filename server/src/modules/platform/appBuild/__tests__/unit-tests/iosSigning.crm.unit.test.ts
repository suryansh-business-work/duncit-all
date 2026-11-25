import { crmIosSigningBundle } from '../../iosSigning.crm';
import { IosSigningModel } from '../../iosSigning.model';
import { buildP12 } from '../../iosSigning.crypto';
import { ascToken, createAppStoreProfile, ensureBundleId } from '../../appStoreConnect.gateway';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { logs } from '@observability/log';

jest.mock('../../appBuild.model', () => ({ AppBuildModel: { findById: jest.fn() } }));
jest.mock('../../iosSigning.model', () => ({ IosSigningModel: { findOne: jest.fn(), create: jest.fn() } }));
jest.mock('../../iosSigning.crypto', () => ({ buildP12: jest.fn(), certificateTeamId: jest.fn(), newSigningRequest: jest.fn() }));
jest.mock('../../appStoreConnect.gateway', () => ({
  ascToken: jest.fn(),
  createAppStoreProfile: jest.fn(),
  createDistributionCertificate: jest.fn(),
  ensureBundleId: jest.fn(),
  ensureCapabilities: jest.fn(),
  revokeCertificate: jest.fn(),
}));
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn() } } }));

const ENV: Record<string, string> = {
  APP_STORE_CONNECT_ISSUER_ID: 'issuer-1',
  APP_STORE_CONNECT_KEY_ID: 'KEY1',
  APP_STORE_CONNECT_PRIVATE_KEY: '-----BEGIN PRIVATE KEY----- AAAA -----END PRIVATE KEY-----',
  APP_STORE_CONNECT_BUNDLE_ID: 'com.duncit.mobile',
  APP_STORE_CONNECT_CRM_BUNDLE_ID: ' com.duncit.crm ',
};
const setEnv = (over: Record<string, string> = {}) =>
  (getRuntimeEnvValue as jest.Mock).mockImplementation(async (key: string) => ({ ...ENV, ...over })[key] ?? '');

/** The member app's current identity: the certificate the CRM profile rides on. */
const member = (over: Record<string, unknown> = {}) => ({
  _id: 'sig1', bundle_id: 'com.duncit.mobile', team_id: 'TEAM1', certificate_id: 'cert1', certificate_serial: 'S1',
  certificate_base64: 'Q0VSVA==', private_key_pem: 'PEM', profile_uuid: 'U1', profile_name: 'Member', profile_base64: 'TUVN',
  expires_at: new Date('2030-01-01T00:00:00Z'), ...over,
});
const crm = (over: Record<string, unknown> = {}) =>
  member({ _id: 'crm1', app: 'CRM', bundle_id: 'com.duncit.crm', profile_uuid: 'U2', profile_name: 'CRM', profile_base64: 'Q1JN', ...over });

/** findOne is called twice: the member identity first, then the CRM profile on its certificate. */
const lookups = (memberDoc: unknown, crmDoc: unknown) => {
  const chain = (value: unknown) => ({ sort: () => ({ select: () => Promise.resolve(value) }) });
  (IosSigningModel.findOne as jest.Mock).mockReturnValueOnce(chain(memberDoc)).mockReturnValueOnce(chain(crmDoc));
};

beforeEach(() => {
  // reset, not clear: a refused call leaves its queued CRM lookup unread.
  jest.resetAllMocks();
  setEnv();
  (buildP12 as jest.Mock).mockReturnValue('P12DATA');
  (ascToken as jest.Mock).mockReturnValue('token');
});

describe('crmIosSigningBundle', () => {
  it('reuses the CRM profile already made on the current certificate, without calling Apple', async () => {
    lookups(member(), crm());
    const out = await crmIosSigningBundle('ci@duncit.com');
    expect(out).toMatchObject({
      team_id: 'TEAM1', bundle_id: 'com.duncit.crm', profile_uuid: 'U2', profile_name: 'CRM', profile_base64: 'Q1JN',
      p12_base64: 'P12DATA', asc_key_id: 'KEY1', asc_issuer_id: 'issuer-1',
    });
    expect(out.p12_password).toMatch(/^[0-9a-f]{32}$/);
    expect(buildP12).toHaveBeenCalledWith('PEM', 'Q0VSVA==', out.p12_password);
    expect(IosSigningModel.findOne).toHaveBeenNthCalledWith(1, { app: { $ne: 'CRM' } });
    expect(IosSigningModel.findOne).toHaveBeenNthCalledWith(2, { app: 'CRM', bundle_id: 'com.duncit.crm', certificate_id: 'cert1' });
    expect(ensureBundleId).not.toHaveBeenCalled();
    expect(createAppStoreProfile).not.toHaveBeenCalled();
    expect(logs.server.warn).toHaveBeenCalledWith('appBuild', 'iosSigningBundle', { by: 'ci@duncit.com', app: 'CRM', certificate_serial: 'S1' });
  });

  it('registers the CRM bundle ID and makes its profile on the member certificate the first time', async () => {
    lookups(member(), null);
    (ensureBundleId as jest.Mock).mockResolvedValue('bid-crm');
    (createAppStoreProfile as jest.Mock).mockResolvedValue({ id: 'p9', uuid: 'U9', name: 'com duncit crm App Store 1', contentBase64: 'TkVX' });
    (IosSigningModel.create as jest.Mock).mockImplementation(async (fields) => fields);

    const out = await crmIosSigningBundle('ci@duncit.com');

    expect(ensureBundleId).toHaveBeenCalledWith('token', 'com.duncit.crm');
    expect(createAppStoreProfile).toHaveBeenCalledWith('token', 'bid-crm', 'cert1', expect.stringMatching(/^com duncit crm App Store \d+$/));
    expect(IosSigningModel.create).toHaveBeenCalledWith({
      app: 'CRM', bundle_id: 'com.duncit.crm', team_id: 'TEAM1', certificate_id: 'cert1', certificate_serial: 'S1',
      certificate_base64: 'Q0VSVA==', private_key_pem: 'PEM', profile_id: 'p9', profile_uuid: 'U9',
      profile_name: 'com duncit crm App Store 1', profile_base64: 'TkVX', expires_at: new Date('2030-01-01T00:00:00Z'),
      created_by: 'ci@duncit.com',
    });
    expect(out).toMatchObject({ bundle_id: 'com.duncit.crm', profile_uuid: 'U9', profile_base64: 'TkVX' });
    expect(logs.server.warn).toHaveBeenCalledWith('appBuild', 'crmIosSigningGenerated', {
      by: 'ci@duncit.com', bundle_id: 'com.duncit.crm', certificate_serial: 'S1', profile_uuid: 'U9',
    });
  });

  it('reports an Apple refusal as bad input and stores nothing', async () => {
    lookups(member(), null);
    (ensureBundleId as jest.Mock).mockResolvedValue('bid-crm');
    (createAppStoreProfile as jest.Mock).mockRejectedValue(new Error('A profile could not be created'));
    await expect(crmIosSigningBundle('ci')).rejects.toMatchObject({
      message: 'A profile could not be created',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(IosSigningModel.create).not.toHaveBeenCalled();
  });

  it('refuses a key that cannot sign before calling Apple', async () => {
    lookups(member(), null);
    (ascToken as jest.Mock).mockImplementation(() => {
      throw new Error('bad pem');
    });
    await expect(crmIosSigningBundle('ci')).rejects.toMatchObject({ message: expect.stringContaining('cannot sign') });
    expect(ensureBundleId).not.toHaveBeenCalled();
  });

  it('refuses when the CRM bundle ID is not set', async () => {
    setEnv({ APP_STORE_CONNECT_CRM_BUNDLE_ID: '  ' });
    await expect(crmIosSigningBundle('ci')).rejects.toMatchObject({
      message: 'Add the Duncit CRM bundle ID in Environment Variables → App Store Connect.',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(IosSigningModel.findOne).not.toHaveBeenCalled();
  });

  it('refuses a CRM bundle ID equal to the member app’s', async () => {
    setEnv({ APP_STORE_CONNECT_CRM_BUNDLE_ID: 'com.duncit.mobile' });
    await expect(crmIosSigningBundle('ci')).rejects.toMatchObject({ message: expect.stringContaining('must be different') });
  });

  it('refuses when App Store Connect itself is not connected', async () => {
    setEnv({ APP_STORE_CONNECT_KEY_ID: '' });
    await expect(crmIosSigningBundle('ci')).rejects.toMatchObject({ message: expect.stringContaining('not connected') });
  });

  it('refuses when the member app has no signing identity yet', async () => {
    lookups(null, null);
    await expect(crmIosSigningBundle('ci')).rejects.toMatchObject({ message: expect.stringContaining('No iOS signing files yet') });
  });

  it('refuses an expired member certificate instead of making a profile on it', async () => {
    lookups(member({ expires_at: new Date(Date.now() - 1000) }), null);
    await expect(crmIosSigningBundle('ci')).rejects.toMatchObject({
      message: 'The iOS signing certificate has expired. Generate new signing files.',
    });
    expect(createAppStoreProfile).not.toHaveBeenCalled();
  });
});
