import { afterEach, describe, expect, it, vi } from 'vitest';

const KEYS = [
  'NODE_ENV',
  'PORT',
  'LITE_MONGO_URI',
  'LITE_MONGO_DB_NAME',
  'LITE_JWT_SECRET',
  'LITE_SITE_URL',
  'LITE_PORTAL_URL',
  'LITE_ADMIN_EMAILS',
  'DUNCIT_GRAPHQL_URL',
  'DUNCIT_APP_URL',
  'LITE_DIST_DIR',
  'LITE_OTP_TEST_CODE',
  'APP_ENV',
  'LITE_MCP_SECRET',
];

/** The env module as a fresh process would read it; every key not given is blank. */
async function loadEnv(values: Record<string, string> = {}) {
  for (const key of KEYS) vi.stubEnv(key, values[key] ?? '');
  vi.resetModules();
  return import('../../config/env');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('env', () => {
  it('falls back to the local defaults when a variable is blank', async () => {
    const { env, isProduction } = await loadEnv();
    expect(env).toMatchObject({
      nodeEnv: 'development',
      port: 2040,
      mongoUri: 'mongodb://127.0.0.1:27017/duncit-lite',
      mongoDbName: '',
      jwtSecret: 'lite-dev-secret',
      siteUrl: 'http://localhost:2041',
      portalUrl: 'http://portal.localhost:2041',
      adminEmails: [],
      duncitGraphqlUrl: 'https://server.duncit.com/graphql',
      duncitAppUrl: 'https://mweb.duncit.com',
      distDir: '',
      otpTestCode: '123456',
      appEnv: 'development',
      mcpSecret: '',
    });
    expect(isProduction).toBe(false);
  });

  it('trims values, drops trailing slashes from public URLs and parses the port', async () => {
    const { env } = await loadEnv({
      PORT: ' 3100 ',
      LITE_SITE_URL: 'https://lite.duncit.com///',
      LITE_PORTAL_URL: 'https://lite-portal.duncit.com/',
      DUNCIT_APP_URL: 'https://mweb.duncit.com/',
      LITE_MCP_SECRET: '  shared-secret  ',
    });
    expect(env.port).toBe(3100);
    expect(env.siteUrl).toBe('https://lite.duncit.com');
    expect(env.portalUrl).toBe('https://lite-portal.duncit.com');
    expect(env.duncitAppUrl).toBe('https://mweb.duncit.com');
    expect(env.mcpSecret).toBe('shared-secret');
  });

  it('reads the bootstrap admin list as lowercase addresses, skipping blanks', async () => {
    const { env } = await loadEnv({ LITE_ADMIN_EMAILS: ' Boss@Duncit.com, ,ops@duncit.com ,' });
    expect(env.adminEmails).toEqual(['boss@duncit.com', 'ops@duncit.com']);
  });

  it('is production only for NODE_ENV=production, and APP_ENV falls back to NODE_ENV', async () => {
    const production = await loadEnv({ NODE_ENV: 'production' });
    expect(production.isProduction).toBe(true);
    expect(production.env.appEnv).toBe('production');

    const staging = await loadEnv({ NODE_ENV: 'production', APP_ENV: 'staging' });
    expect(staging.env.appEnv).toBe('staging');
  });
});
