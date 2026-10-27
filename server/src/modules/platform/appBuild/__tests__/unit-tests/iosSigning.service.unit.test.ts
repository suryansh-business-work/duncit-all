import {
  appStoreSettings,
  generateIosSigning,
  iosSigningBundle,
  iosSigningFile,
  iosSigningForBuild,
  readAscConfig,
  requireAscConfig,
} from '../../iosSigning.service';
import { AppBuildModel } from '../../appBuild.model';
import { IosSigningModel } from '../../iosSigning.model';
import { buildP12, certificateTeamId, newSigningRequest } from '../../iosSigning.crypto';
import {
  ascToken,
  createAppStoreProfile,
  createDistributionCertificate,
  ensureBundleId,
  ensureCapabilities,
  revokeCertificate,
} from '../../appStoreConnect.gateway';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { logs } from '@observability/log';

jest.mock('../../appBuild.model', () => ({ AppBuildModel: { findById: jest.fn() } }));
jest.mock('../../iosSigning.model', () => ({ IosSigningModel: { findOne: jest.fn(), findById: jest.fn(), create: jest.fn() } }));
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

const ENV = {
  APP_STORE_CONNECT_ISSUER_ID: ' issuer-1 ',
  APP_STORE_CONNECT_KEY_ID: ' KEY1 ',
  APP_STORE_CONNECT_PRIVATE_KEY: ' -----BEGIN PRIVATE KEY----- AAAA BBBB -----END PRIVATE KEY----- ',
  APP_STORE_CONNECT_BUNDLE_ID: ' com.duncit.app ',
};
const setEnv = (over: Record<string, string> = {}) =>
  (getRuntimeEnvValue as jest.Mock).mockImplementation(async (key: keyof typeof ENV) => ({ ...ENV, ...over })[key] ?? '');

const doc = (over: Record<string, unknown> = {}) => ({
  _id: 'sig1', bundle_id: 'com.duncit.app', team_id: 'TEAM1', certificate_serial: 'S1', profile_name: 'Profile', profile_uuid: 'U1',
  profile_base64: 'UFJPRg==', certificate_base64: 'Q0VSVA==', private_key_pem: 'PEM', expires_at: new Date('2030-01-01T00:00:00Z'),
  created_by: 'ops', created_at: new Date('2026-01-01T00:00:00Z'), ...over,
});
const sorted = (value: unknown) => ({ sort: () => Promise.resolve(value) });
const selecting = (value: unknown) => ({ sort: () => ({ select: () => Promise.resolve(value) }) });

beforeEach(() => setEnv());

describe('readAscConfig / requireAscConfig', () => {
  it('returns the trimmed credentials and bundle id', async () => {
    await expect(readAscConfig()).resolves.toEqual({
      creds: { issuerId: 'issuer-1', keyId: 'KEY1', privateKey: '-----BEGIN PRIVATE KEY----- AAAA BBBB -----END PRIVATE KEY-----' },
      bundleId: 'com.duncit.app',
    });
  });

  it.each(Object.keys(ENV))('is null while %s is missing', async (key) => {
    setEnv({ [key]: '   ' });
    await expect(readAscConfig()).resolves.toBeNull();
    await expect(requireAscConfig()).rejects.toMatchObject({
      message: expect.stringContaining('Environment Variables → App Store Connect'),
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('requireAscConfig returns the config when complete', async () => {
    await expect(requireAscConfig()).resolves.toMatchObject({ bundleId: 'com.duncit.app' });
  });
});

describe('appStoreSettings', () => {
  it('reports the key as configured with the current identity, never the key or files', async () => {
    (IosSigningModel.findOne as jest.Mock).mockReturnValue(sorted(doc()));
    const out = await appStoreSettings();
    expect(out).toEqual({
      configured: true,
      bundleId: 'com.duncit.app',
      signing: {
        id: 'sig1', bundle_id: 'com.duncit.app', team_id: 'TEAM1', certificate_serial: 'S1', profile_name: 'Profile',
        expires_at: '2030-01-01T00:00:00.000Z', created_by: 'ops', created_at: '2026-01-01T00:00:00.000Z',
      },
    });
    expect(JSON.stringify(out)).not.toContain('PEM');
  });

  it('is empty when nothing is configured or generated, and shows missing dates as null', async () => {
    setEnv({ APP_STORE_CONNECT_KEY_ID: '' });
    (IosSigningModel.findOne as jest.Mock).mockReturnValue(sorted(null));
    await expect(appStoreSettings()).resolves.toEqual({ configured: false, bundleId: '', signing: null });
    (IosSigningModel.findOne as jest.Mock).mockReturnValue(sorted(doc({ expires_at: null, created_at: null })));
    const out = await appStoreSettings();
    expect(out.signing).toMatchObject({ expires_at: null, created_at: null });
  });
});

describe('generateIosSigning', () => {
  const arrange = () => {
    (ascToken as jest.Mock).mockReturnValue('jwt');
    (ensureBundleId as jest.Mock).mockResolvedValue('bid1');
    (newSigningRequest as jest.Mock).mockResolvedValue({ csrPem: 'CSR', privateKeyPem: 'KEY' });
    (createDistributionCertificate as jest.Mock).mockResolvedValue({ id: 'c1', serialNumber: 'S9', contentBase64: 'CERT', expiresAt: '2027-05-05T00:00:00Z' });
    (createAppStoreProfile as jest.Mock).mockResolvedValue({ id: 'p1', uuid: 'U9', name: 'Prof', contentBase64: 'PROF' });
    (certificateTeamId as jest.Mock).mockReturnValue('TEAM9');
    (IosSigningModel.create as jest.Mock).mockImplementation(async (d) => doc({ ...d, _id: 'new1', created_at: new Date('2026-02-02T00:00:00Z') }));
  };

  it('makes the App ID, certificate and profile in order, stores them and logs it', async () => {
    arrange();
    const out = await generateIosSigning('ops@duncit.com');
    expect(ensureBundleId).toHaveBeenCalledWith('jwt', 'com.duncit.app');
    expect(ensureCapabilities).toHaveBeenCalledWith('jwt', 'bid1');
    expect(newSigningRequest).toHaveBeenCalledWith('com.duncit.app distribution');
    expect(createDistributionCertificate).toHaveBeenCalledWith('jwt', 'CSR');
    expect((createAppStoreProfile as jest.Mock).mock.calls[0].slice(0, 3)).toEqual(['jwt', 'bid1', 'c1']);
    expect((createAppStoreProfile as jest.Mock).mock.calls[0][3]).toMatch(/^com duncit app App Store \d+$/);
    expect(IosSigningModel.create).toHaveBeenCalledWith(expect.objectContaining({
      bundle_id: 'com.duncit.app', team_id: 'TEAM9', certificate_id: 'c1', certificate_serial: 'S9', certificate_base64: 'CERT',
      private_key_pem: 'KEY', profile_id: 'p1', profile_uuid: 'U9', profile_name: 'Prof', profile_base64: 'PROF',
      expires_at: new Date('2027-05-05T00:00:00Z'), created_by: 'ops@duncit.com',
    }));
    expect(out).toMatchObject({ id: 'new1', team_id: 'TEAM9' });
    expect(JSON.stringify(out)).not.toContain('KEY');
    expect(logs.server.warn).toHaveBeenCalledWith('appBuild', 'iosSigningGenerated', { by: 'ops@duncit.com', bundle_id: 'com.duncit.app', certificate_serial: 'S9', profile_uuid: 'U9' });
  });

  it('stores no expiry when Apple gave none', async () => {
    arrange();
    (createDistributionCertificate as jest.Mock).mockResolvedValue({ id: 'c1', serialNumber: 'S', contentBase64: 'C', expiresAt: '' });
    await generateIosSigning('ops');
    expect((IosSigningModel.create as jest.Mock).mock.calls[0][0].expires_at).toBeNull();
  });

  it('refuses before calling Apple when the key cannot sign', async () => {
    arrange();
    (ascToken as jest.Mock).mockImplementation(() => {
      throw new Error('bad key');
    });
    await expect(generateIosSigning('ops')).rejects.toMatchObject({
      message: 'The App Store Connect key cannot sign. Paste the whole .p8 file, BEGIN and END lines included.',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(ensureBundleId).not.toHaveBeenCalled();
  });

  it('refuses when App Store Connect is not connected', async () => {
    setEnv({ APP_STORE_CONNECT_BUNDLE_ID: '' });
    await expect(generateIosSigning('ops')).rejects.toMatchObject({ message: expect.stringContaining('not connected') });
  });

  it('revokes the new certificate when the profile fails, so no orphan holds a slot', async () => {
    arrange();
    (createAppStoreProfile as jest.Mock).mockRejectedValue(new Error('profile refused'));
    (revokeCertificate as jest.Mock).mockResolvedValue(undefined);
    await expect(generateIosSigning('ops')).rejects.toMatchObject({ message: 'profile refused', extensions: { code: 'BAD_USER_INPUT' } });
    expect(revokeCertificate).toHaveBeenCalledWith('jwt', 'c1');
    expect(IosSigningModel.create).not.toHaveBeenCalled();
  });

  it('logs a failed revoke and still reports the profile failure', async () => {
    arrange();
    (createAppStoreProfile as jest.Mock).mockRejectedValue(new Error('profile refused'));
    (revokeCertificate as jest.Mock).mockRejectedValue(new Error('revoke refused'));
    await expect(generateIosSigning('ops')).rejects.toMatchObject({ message: 'profile refused' });
    expect(logs.server.error).toHaveBeenCalledWith('appBuild', 'iosSigningRevoke', { error: expect.any(Error), certificate_id: 'c1' });
  });

  it('reports any other failure as bad input, stringifying a non-Error', async () => {
    arrange();
    (ensureCapabilities as jest.Mock).mockRejectedValue('apple down');
    await expect(generateIosSigning('ops')).rejects.toMatchObject({ message: 'apple down' });
  });
});

describe('iosSigningForBuild', () => {
  const buildLean = (value: unknown) => (AppBuildModel.findById as jest.Mock).mockReturnValue({ lean: () => Promise.resolve(value) });

  it('finds the identity that was newest when an iOS build ran', async () => {
    const created = new Date('2026-03-03T00:00:00Z');
    buildLean({ platform: 'IOS', created_at: created });
    (IosSigningModel.findOne as jest.Mock).mockReturnValue(sorted(doc()));
    await expect(iosSigningForBuild('b1')).resolves.toMatchObject({ id: 'sig1' });
    expect(IosSigningModel.findOne).toHaveBeenCalledWith({ created_at: { $lte: created } });
  });

  it('is null on Android, for a missing build and for a build from before any identity', async () => {
    buildLean({ platform: 'ANDROID' });
    await expect(iosSigningForBuild('b1')).resolves.toBeNull();
    buildLean(null);
    await expect(iosSigningForBuild('b1')).resolves.toBeNull();
    buildLean({ platform: 'IOS', created_at: new Date() });
    (IosSigningModel.findOne as jest.Mock).mockReturnValue(sorted(null));
    await expect(iosSigningForBuild('b1')).resolves.toBeNull();
  });
});

describe('iosSigningFile', () => {
  const found = (value: unknown) => (IosSigningModel.findById as jest.Mock).mockReturnValue({ select: () => Promise.resolve(value) });

  it('refuses files that no longer exist', async () => {
    found(null);
    await expect(iosSigningFile('x', 'CERTIFICATE', 'ops')).rejects.toMatchObject({ message: 'Those signing files no longer exist.' });
  });

  it('serves the certificate and the profile as they are, and logs who asked', async () => {
    found(doc());
    await expect(iosSigningFile('sig1', 'CERTIFICATE', 'ops')).resolves.toEqual({ file_name: 'com.duncit.app-distribution.cer', content_base64: 'Q0VSVA==', password: '' });
    await expect(iosSigningFile('sig1', 'PROFILE', 'ops')).resolves.toEqual({ file_name: 'com.duncit.app-app-store.mobileprovision', content_base64: 'UFJPRg==', password: '' });
    expect(logs.server.warn).toHaveBeenCalledWith('appBuild', 'iosSigningDownload', { by: 'ops', kind: 'CERTIFICATE', certificate_serial: 'S1' });
  });

  it('builds a .p12 with a fresh password each time', async () => {
    found(doc());
    (buildP12 as jest.Mock).mockReturnValue('P12DATA');
    const a = await iosSigningFile('sig1', 'P12', 'ops');
    const b = await iosSigningFile('sig1', 'P12', 'ops');
    expect(a).toMatchObject({ file_name: 'com.duncit.app-distribution.p12', content_base64: 'P12DATA' });
    expect(a.password).toMatch(/^[0-9a-f]{32}$/);
    expect(a.password).not.toBe(b.password);
    expect(buildP12).toHaveBeenCalledWith('PEM', 'Q0VSVA==', a.password);
  });

  it('serves the API key as a re-wrapped .p8', async () => {
    found(doc());
    const out = await iosSigningFile('sig1', 'API_KEY', 'ops');
    expect(out.file_name).toBe('AuthKey_KEY1.p8');
    expect(Buffer.from(out.content_base64, 'base64').toString()).toBe('-----BEGIN PRIVATE KEY-----\nAAAABBBB\n-----END PRIVATE KEY-----');
    expect(out.password).toBe('');
  });
});

describe('iosSigningBundle', () => {
  const newestDoc = (value: unknown) => (IosSigningModel.findOne as jest.Mock).mockReturnValue(selecting(value));

  it('hands the workflow everything it signs and uploads with', async () => {
    newestDoc(doc());
    (buildP12 as jest.Mock).mockReturnValue('P12DATA');
    const out = await iosSigningBundle('ci');
    expect(out).toMatchObject({
      team_id: 'TEAM1', bundle_id: 'com.duncit.app', profile_uuid: 'U1', profile_name: 'Profile', profile_base64: 'UFJPRg==',
      p12_base64: 'P12DATA', asc_key_id: 'KEY1', asc_issuer_id: 'issuer-1',
    });
    expect(out.p12_password).toMatch(/^[0-9a-f]{32}$/);
    expect(out.asc_private_key).toBe('-----BEGIN PRIVATE KEY-----\nAAAABBBB\n-----END PRIVATE KEY-----');
    expect(logs.server.warn).toHaveBeenCalledWith('appBuild', 'iosSigningBundle', { by: 'ci', certificate_serial: 'S1' });
  });

  it('accepts an identity that never expires', async () => {
    newestDoc(doc({ expires_at: null }));
    await expect(iosSigningBundle('ci')).resolves.toMatchObject({ team_id: 'TEAM1' });
  });

  it('refuses when there are no signing files yet', async () => {
    newestDoc(null);
    await expect(iosSigningBundle('ci')).rejects.toMatchObject({ message: expect.stringContaining('No iOS signing files yet') });
  });

  it('refuses an identity made for another bundle id', async () => {
    newestDoc(doc({ bundle_id: 'com.other' }));
    await expect(iosSigningBundle('ci')).rejects.toMatchObject({
      message: 'The newest signing files are for com.other, but App Store Connect is set to com.duncit.app. Generate new ones.',
    });
  });

  it('refuses an expired certificate', async () => {
    newestDoc(doc({ expires_at: new Date(Date.now() - 1000) }));
    await expect(iosSigningBundle('ci')).rejects.toMatchObject({ message: 'The iOS signing certificate has expired. Generate new signing files.' });
  });
});
