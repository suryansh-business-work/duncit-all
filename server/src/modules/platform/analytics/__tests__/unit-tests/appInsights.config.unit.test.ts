jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));

import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { bucketName, readAppleInsightsConfig, readPlayInsightsConfig } from '../../appInsights/appInsights.config';

const env = getRuntimeEnvValue as jest.Mock;
const KEY = JSON.stringify({ client_email: 'insights@proj.iam.gserviceaccount.com', private_key: '-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----' });

const withEnv = (values: Record<string, string>) => env.mockImplementation(async (name: string) => values[name] ?? '');

beforeEach(() => env.mockReset());

describe('bucketName', () => {
  it('takes the bucket out of a gs:// address, with or without a folder or slash', () => {
    expect(bucketName('gs://pubsite_prod_rev_01234567890123456789/')).toBe('pubsite_prod_rev_01234567890123456789');
    expect(bucketName(' GS://pubsite_prod_rev_123/stats/installs ')).toBe('pubsite_prod_rev_123');
    expect(bucketName('pubsite_prod_rev_123')).toBe('pubsite_prod_rev_123');
  });

  it('refuses what cannot be a bucket name', () => {
    expect(bucketName('')).toBe('');
    expect(bucketName('https://console.cloud.google.com/storage')).toBe('');
    expect(bucketName('Has Spaces')).toBe('');
  });
});

describe('readPlayInsightsConfig', () => {
  it('reads the service account, package and bucket from the Google Play env entry', async () => {
    withEnv({
      GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: KEY,
      GOOGLE_PLAY_PACKAGE_NAME: ' com.duncit.mobile ',
      GOOGLE_PLAY_REPORTS_BUCKET: 'gs://pubsite_prod_rev_1/',
    });
    const read = await readPlayInsightsConfig();
    expect(read.missing).toEqual([]);
    expect(read.config).toMatchObject({
      packageName: 'com.duncit.mobile',
      bucket: 'pubsite_prod_rev_1',
      account: { client_email: 'insights@proj.iam.gserviceaccount.com' },
    });
  });

  it('names every blank field and returns no config — releases configured, bucket not yet', async () => {
    withEnv({ GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: KEY, GOOGLE_PLAY_PACKAGE_NAME: 'com.duncit.mobile' });
    await expect(readPlayInsightsConfig()).resolves.toEqual({ config: null, missing: ['reports_bucket'], problem: '' });
  });

  it('says why a bucket value that is set cannot be used', async () => {
    withEnv({ GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: KEY, GOOGLE_PLAY_PACKAGE_NAME: 'p', GOOGLE_PLAY_REPORTS_BUCKET: 'not a bucket!' });
    const read = await readPlayInsightsConfig();
    expect(read.config).toBeNull();
    expect(read.problem).toMatch(/not a Cloud Storage bucket/);
  });

  it('says why a key that is not a service account JSON cannot be used — without echoing it', async () => {
    withEnv({ GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: '{secret-ish', GOOGLE_PLAY_PACKAGE_NAME: 'p', GOOGLE_PLAY_REPORTS_BUCKET: 'b12' });
    const read = await readPlayInsightsConfig();
    expect(read.config).toBeNull();
    expect(read.problem).toMatch(/not valid JSON/);
    expect(read.problem).not.toContain('secret-ish');
  });
});

describe('readAppleInsightsConfig', () => {
  it('reads the App Store Connect key and bundle ID, trimmed', async () => {
    withEnv({
      APP_STORE_CONNECT_ISSUER_ID: ' 6a7c-issuer ',
      APP_STORE_CONNECT_KEY_ID: 'KEY123',
      APP_STORE_CONNECT_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----',
      APP_STORE_CONNECT_BUNDLE_ID: 'com.duncit.mobile',
    });
    await expect(readAppleInsightsConfig()).resolves.toEqual({
      config: {
        creds: { issuerId: '6a7c-issuer', keyId: 'KEY123', privateKey: '-----BEGIN PRIVATE KEY-----' },
        bundleId: 'com.duncit.mobile',
      },
      missing: [],
      problem: '',
    });
  });

  it('names the missing fields', async () => {
    withEnv({ APP_STORE_CONNECT_ISSUER_ID: 'i' });
    const read = await readAppleInsightsConfig();
    expect(read.config).toBeNull();
    expect(read.missing).toEqual(['key_id', 'private_key', 'bundle_id']);
  });
});
