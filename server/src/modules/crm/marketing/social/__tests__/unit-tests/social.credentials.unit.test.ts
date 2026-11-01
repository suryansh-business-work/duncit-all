/**
 * One app per network: each provider reads its own category through
 * `SOCIAL_<PROVIDER>_<FIELD>`, and the readiness list says where each app is
 * set up. No database and no network — the runtime env and the URL config
 * are stubbed.
 */
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn() }));

import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { getUrlConfigs } from '@config/url-configs';
import {
  APP_FIELDS,
  SOCIAL_ENV_CATEGORIES,
  credentialsFrom,
  providerOfCategory,
  providerReadiness,
  socialCredentials,
  socialEnvKey,
  socialRedirectUri,
} from '../../social.credentials';
import { SOCIAL_PROVIDERS } from '../../social.types';

const env = getRuntimeEnvValue as jest.Mock;
const urls = getUrlConfigs as jest.Mock;

beforeEach(() => {
  env.mockReset();
  urls.mockReset().mockResolvedValue({ serverUrl: 'https://api.duncit.test/' });
});

describe('APP_FIELDS', () => {
  it('gives every network its own category, in the order the providers are listed', () => {
    const categories = SOCIAL_PROVIDERS.map((provider) => APP_FIELDS[provider].category);
    expect(categories).toEqual([
      'SOCIAL_INSTAGRAM',
      'SOCIAL_FACEBOOK',
      'SOCIAL_THREADS',
      'SOCIAL_YOUTUBE',
      'SOCIAL_LINKEDIN',
      'SOCIAL_X',
    ]);
    expect(new Set(categories).size).toBe(SOCIAL_PROVIDERS.length);
    expect(SOCIAL_ENV_CATEGORIES).toEqual(categories);
  });

  it('keeps Instagram, Facebook and Threads as three separate Meta apps', () => {
    expect(APP_FIELDS.INSTAGRAM).toMatchObject({ id: 'app_id', secret: 'app_secret', version: { field: 'graph_version', fallback: 'v23.0' } });
    expect(APP_FIELDS.FACEBOOK).toMatchObject({ id: 'app_id', secret: 'app_secret', version: { field: 'graph_version', fallback: 'v23.0' } });
    expect(APP_FIELDS.THREADS).toMatchObject({ id: 'app_id', secret: 'app_secret', version: { field: 'graph_version', fallback: 'v1.0' } });
    expect(APP_FIELDS.INSTAGRAM.category).not.toBe(APP_FIELDS.FACEBOOK.category);
  });

  it('maps a category back to its provider, and nothing else to anything', () => {
    expect(providerOfCategory('SOCIAL_THREADS')).toBe('THREADS');
    expect(providerOfCategory('SOCIAL_X')).toBe('X');
    expect(providerOfCategory('SERPER')).toBeNull();
    expect(providerOfCategory('SOCIAL_APPS')).toBeNull();
  });

  it('derives the runtime key from the provider and field', () => {
    expect(socialEnvKey('INSTAGRAM', 'app_id')).toBe('SOCIAL_INSTAGRAM_APP_ID');
    expect(socialEnvKey('LINKEDIN', 'api_version')).toBe('SOCIAL_LINKEDIN_API_VERSION');
  });
});

describe('socialRedirectUri', () => {
  it('is the one callback under the server URL, trailing slash or not', async () => {
    expect(await socialRedirectUri()).toBe('https://api.duncit.test/social/callback');
    urls.mockResolvedValue({ serverUrl: 'https://api.duncit.test' });
    expect(await socialRedirectUri()).toBe('https://api.duncit.test/social/callback');
  });
});

describe('credentialsFrom', () => {
  const read = (fields: Record<string, string>) => (name: string) => fields[name] ?? '';

  it('is null until both the id and the secret are there', async () => {
    expect(await credentialsFrom('FACEBOOK', read({ app_id: '1' }), 'https://cb')).toBeNull();
    expect(await credentialsFrom('FACEBOOK', read({ app_secret: 's' }), 'https://cb')).toBeNull();
  });

  it('falls back to the provider default version and otherwise reads the typed one', async () => {
    expect(await credentialsFrom('THREADS', read({ app_id: '1', app_secret: 's' }), 'https://cb')).toEqual({
      clientId: '1',
      clientSecret: 's',
      redirectUri: 'https://cb',
      version: 'v1.0',
    });
    expect(await credentialsFrom('LINKEDIN', read({ client_id: '1', client_secret: 's', api_version: '202601' }), 'https://cb')).toEqual({
      clientId: '1',
      clientSecret: 's',
      redirectUri: 'https://cb',
      version: '202601',
    });
  });

  it('has no version for a provider without one', async () => {
    expect(await credentialsFrom('X', read({ client_id: '1', client_secret: 's' }), 'https://cb')).toMatchObject({ version: '' });
  });
});

describe('socialCredentials', () => {
  it('reads each field through its own SOCIAL_<PROVIDER>_<FIELD> key', async () => {
    env.mockImplementation(async (key: string) => ({ SOCIAL_INSTAGRAM_APP_ID: 'ig-id', SOCIAL_INSTAGRAM_APP_SECRET: 'ig-secret' })[key] ?? '');
    expect(await socialCredentials('INSTAGRAM')).toEqual({
      clientId: 'ig-id',
      clientSecret: 'ig-secret',
      redirectUri: 'https://api.duncit.test/social/callback',
      version: 'v23.0',
    });
    expect(env).toHaveBeenCalledWith('SOCIAL_INSTAGRAM_GRAPH_VERSION');
    // The Facebook app is a different entry: Instagram's keys do not answer for it.
    expect(await socialCredentials('FACEBOOK')).toBeNull();
  });
});

describe('providerReadiness', () => {
  it('says which networks can be connected and where each app is set up', async () => {
    env.mockImplementation(async (key: string) => (key.startsWith('SOCIAL_THREADS_') ? 'set' : ''));
    const ready = await providerReadiness();
    expect(ready).toHaveLength(6);
    expect(ready.find((r) => r.provider === 'THREADS')).toEqual({ provider: 'THREADS', configured: true, category: 'SOCIAL_THREADS' });
    expect(ready.find((r) => r.provider === 'YOUTUBE')).toEqual({ provider: 'YOUTUBE', configured: false, category: 'SOCIAL_YOUTUBE' });
  });
});
