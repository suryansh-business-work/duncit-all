/**
 * One app per network: each provider reads its own category through
 * `SOCIAL_<PROVIDER>_<FIELD>`, and the readiness list says where each app is
 * set up. No database and no network — the runtime env and the URL config
 * are stubbed.
 */
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn() }));
jest.mock('@modules/platform/envEntry/envEntry.model', () => ({ EnvEntryModel: { find: jest.fn(), findOne: jest.fn() } }));

import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { getUrlConfigs } from '@config/url-configs';
import { Types } from 'mongoose';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import {
  APP_FIELDS,
  SOCIAL_ENV_CATEGORIES,
  credentialsFrom,
  metaWebhookApps,
  metaWebhookKeys,
  providerOfCategory,
  providerReadiness,
  socialCredentials,
  socialEnvKey,
  socialRedirectUri,
  socialWebhookUrl,
} from '../../social.credentials';
import { SOCIAL_PROVIDERS } from '../../social.types';

const env = getRuntimeEnvValue as jest.Mock;
const urls = getUrlConfigs as jest.Mock;
const find = EnvEntryModel.find as jest.Mock;
const findOne = EnvEntryModel.findOne as jest.Mock;

/** A Mongoose query that ends in lean(), answering with `rows`; select and sort hand back the same query. */
const query = (rows: unknown) => {
  const q = { select: jest.fn(), sort: jest.fn(), lean: jest.fn().mockResolvedValue(rows) };
  q.select.mockReturnValue(q);
  q.sort.mockReturnValue(q);
  return q;
};
const entry = (category: string, name: string, config: Record<string, unknown>, isDefault = false) => ({
  _id: new Types.ObjectId(),
  category,
  name,
  is_default: isDefault,
  config,
});

beforeEach(() => {
  env.mockReset();
  find.mockReset().mockReturnValue(query([]));
  findOne.mockReset().mockReturnValue(query(null));
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
      // A Meta app always carries its Login for Business configuration, blank when none is set.
      configId: '',
    });
    expect(env).toHaveBeenCalledWith('SOCIAL_INSTAGRAM_GRAPH_VERSION');
    // The Facebook app is a different entry: Instagram's keys do not answer for it.
    expect(await socialCredentials('FACEBOOK')).toBeNull();
    expect(findOne).not.toHaveBeenCalled();
  });

  it("reads a chosen entry by id, only inside the provider's category and only while it is active", async () => {
    const id = new Types.ObjectId();
    findOne.mockReturnValue(query({ config: { app_id: 'brand-2', app_secret: 'brand-2-secret', graph_version: 'v24.0', login_config_id: ' cfg ' } }));
    expect(await socialCredentials('FACEBOOK', id)).toEqual({
      clientId: 'brand-2',
      clientSecret: 'brand-2-secret',
      redirectUri: 'https://api.duncit.test/social/callback',
      version: 'v24.0',
      configId: 'cfg',
    });
    expect(findOne).toHaveBeenCalledWith({ _id: id.toHexString(), category: 'SOCIAL_FACEBOOK', is_active: true });
    // The default entry's keys are never read for a chosen app.
    expect(env).not.toHaveBeenCalled();
  });

  it('is null for a chosen entry that is gone, switched off, in another category or missing a key', async () => {
    expect(await socialCredentials('X', new Types.ObjectId().toHexString())).toBeNull();
    findOne.mockReturnValue(query({ config: { client_id: 'only-id' } }));
    expect(await socialCredentials('X', new Types.ObjectId().toHexString())).toBeNull();
  });

  it('never queries with an id that is not an ObjectId, and treats a blank id as the default', async () => {
    expect(await socialCredentials('X', 'not-an-id')).toBeNull();
    expect(findOne).not.toHaveBeenCalled();
    env.mockImplementation(async (key: string) => ({ SOCIAL_X_CLIENT_ID: 'x', SOCIAL_X_CLIENT_SECRET: 's' })[key] ?? '');
    expect(await socialCredentials('X', '   ')).toMatchObject({ clientId: 'x' });
    expect(await socialCredentials('X', null)).toMatchObject({ clientId: 'x' });
    expect(findOne).not.toHaveBeenCalled();
  });
});

describe('providerReadiness', () => {
  it('lists every complete app per network, says which can be connected and where each is set up', async () => {
    const main = entry('SOCIAL_FACEBOOK', 'Duncit', { app_id: '1', app_secret: 's' }, true);
    const brand = entry('SOCIAL_FACEBOOK', 'Brand two', { app_id: '2', app_secret: 't' });
    const halfDone = entry('SOCIAL_FACEBOOK', 'No secret yet', { app_id: '3' });
    const threads = entry('SOCIAL_THREADS', 'Threads app', { app_id: '4', app_secret: 'u' });
    find.mockReturnValue(query([main, brand, halfDone, threads]));

    const ready = await providerReadiness();

    expect(ready).toHaveLength(6);
    expect(ready.find((r) => r.provider === 'FACEBOOK')).toEqual({
      provider: 'FACEBOOK',
      configured: true,
      category: 'SOCIAL_FACEBOOK',
      apps: [
        { id: String(main._id), name: 'Duncit', is_default: true },
        { id: String(brand._id), name: 'Brand two', is_default: false },
      ],
    });
    expect(ready.find((r) => r.provider === 'THREADS')?.apps).toEqual([{ id: String(threads._id), name: 'Threads app', is_default: false }]);
    expect(ready.find((r) => r.provider === 'YOUTUBE')).toEqual({ provider: 'YOUTUBE', configured: false, category: 'SOCIAL_YOUTUBE', apps: [] });
    // Only active entries of the social categories are read.
    expect(find).toHaveBeenCalledWith({ category: { $in: SOCIAL_ENV_CATEGORIES }, is_active: true });
  });

  it('never sends a key out: an app is its id, name and default flag only', async () => {
    find.mockReturnValue(query([entry('SOCIAL_X', 'X app', { client_id: 'cid', client_secret: 'very-secret' }, true)]));
    const x = (await providerReadiness()).find((r) => r.provider === 'X');
    expect(JSON.stringify(x)).not.toContain('very-secret');
    expect(JSON.stringify(x)).not.toContain('cid');
  });
});

describe('metaWebhookKeys', () => {
  it("collects every active Instagram and Facebook app's secret and verify token, skipping blanks", async () => {
    find.mockReturnValue(
      query([
        { config: { app_secret: 'main-secret', webhook_verify_token: ' main-token ' } },
        { config: { app_secret: 'brand-secret' } },
        { config: {} },
      ])
    );
    expect(await metaWebhookKeys()).toEqual({ secrets: ['main-secret', 'brand-secret'], verifyTokens: ['main-token'] });
    expect(find).toHaveBeenCalledWith({ category: { $in: ['SOCIAL_INSTAGRAM', 'SOCIAL_FACEBOOK'] }, is_active: true });
  });
});

describe('metaWebhookApps', () => {
  it('reads each active Meta entry’s id, keys and Graph version, falling back to the default version', async () => {
    const id = new Types.ObjectId();
    find.mockReturnValue(
      query([
        { _id: id, name: 'Duncit', category: 'SOCIAL_INSTAGRAM', config: { app_id: ' 2706 ', app_secret: 's', webhook_verify_token: 't', graph_version: 'v24.0' } },
        { _id: 'x', name: 'Bare', category: 'SOCIAL_FACEBOOK', config: {} },
      ])
    );
    expect(await metaWebhookApps()).toEqual([
      { entry_id: String(id), name: 'Duncit', provider: 'INSTAGRAM', app_id: '2706', app_secret: 's', verify_token: 't', version: 'v24.0' },
      { entry_id: 'x', name: 'Bare', provider: 'FACEBOOK', app_id: '', app_secret: '', verify_token: '', version: 'v23.0' },
    ]);
  });
});

describe('socialWebhookUrl', () => {
  it('is the server address plus /social/webhook, without a doubled slash', async () => {
    urls.mockResolvedValue({ serverUrl: 'https://server.duncit.com/' });
    expect(await socialWebhookUrl()).toBe('https://server.duncit.com/social/webhook');
  });
});
