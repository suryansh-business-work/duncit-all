/**
 * The boot-time move from one "Social apps" entry and one Meta app to one
 * entry per network, against a real database. Legacy rows are written raw
 * because the current schema no longer admits them — which is the point.
 */
import { Types } from 'mongoose';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import { SocialAccountModel } from '../../social.model';
import { migrateSocialAppEntries, migrateSocialApps, migrateSocialProviders, splitLegacyConfig } from '../../social.migration';

const legacyEntry = (config: Record<string, string>, over: Record<string, unknown> = {}) =>
  EnvEntryModel.collection.insertOne({
    name: 'Social apps',
    category: 'SOCIAL_APPS',
    description: 'all four',
    is_default: true,
    is_active: true,
    config,
    assigned_portals: ['marketing'],
    created_at: new Date(),
    updated_at: new Date(),
    ...over,
  });

const FULL = {
  meta_app_id: 'fb-id',
  meta_app_secret: 'fb-secret',
  meta_graph_version: 'v22.0',
  linkedin_client_id: 'li-id',
  linkedin_client_secret: 'li-secret',
  linkedin_api_version: '202509',
  x_client_id: 'x-id',
  x_client_secret: 'x-secret',
  youtube_client_id: 'yt-id',
  youtube_client_secret: 'yt-secret',
};

afterEach(async () => {
  await Promise.all([EnvEntryModel.deleteMany({}), SocialAccountModel.deleteMany({})]);
});

describe('splitLegacyConfig', () => {
  it('moves each network’s keys into its own category under the new field names', () => {
    const split = splitLegacyConfig(FULL);
    expect([...split.keys()]).toEqual(['SOCIAL_FACEBOOK', 'SOCIAL_LINKEDIN', 'SOCIAL_X', 'SOCIAL_YOUTUBE']);
    expect(split.get('SOCIAL_FACEBOOK')).toEqual({ app_id: 'fb-id', app_secret: 'fb-secret', graph_version: 'v22.0' });
    expect(split.get('SOCIAL_LINKEDIN')).toEqual({ client_id: 'li-id', client_secret: 'li-secret', api_version: '202509' });
    expect(split.get('SOCIAL_X')).toEqual({ client_id: 'x-id', client_secret: 'x-secret' });
  });

  it('leaves out a network that had only one of its two keys, and ignores blanks and unknown fields', () => {
    const split = splitLegacyConfig({ meta_app_id: 'fb-id', x_client_id: ' ', x_client_secret: 'x', something_else: 'v' });
    expect(split.size).toBe(0);
  });

  it('copes with no config at all', () => {
    expect(splitLegacyConfig(undefined).size).toBe(0);
  });
});

describe('migrateSocialAppEntries', () => {
  it('splits the combined entry into per-network entries and removes it', async () => {
    await legacyEntry(FULL);
    expect(await migrateSocialAppEntries()).toBe(4);
    const entries = await EnvEntryModel.find().sort({ category: 1 }).lean();
    expect(entries.map((e) => e.category)).toEqual(['SOCIAL_FACEBOOK', 'SOCIAL_LINKEDIN', 'SOCIAL_X', 'SOCIAL_YOUTUBE']);
    const facebook = entries.find((e) => e.category === 'SOCIAL_FACEBOOK');
    expect(facebook).toMatchObject({
      name: 'Social apps · Facebook app',
      description: 'all four',
      is_default: true,
      is_active: true,
      assigned_portals: ['marketing'],
      config: { app_id: 'fb-id', app_secret: 'fb-secret', graph_version: 'v22.0' },
    });
    // Instagram and Threads are new apps with their own IDs: nothing from the old entry fits them.
    expect(await EnvEntryModel.exists({ category: 'SOCIAL_INSTAGRAM' })).toBeNull();
    expect(await EnvEntryModel.exists({ category: 'SOCIAL_THREADS' })).toBeNull();
    expect(await EnvEntryModel.collection.countDocuments({ category: 'SOCIAL_APPS' })).toBe(0);
  });

  it('keeps an entry a network already has instead of adding a second one', async () => {
    await EnvEntryModel.create({ name: 'Facebook (new)', category: 'SOCIAL_FACEBOOK', config: { app_id: 'new', app_secret: 'new' } });
    await legacyEntry(FULL);
    expect(await migrateSocialAppEntries()).toBe(3);
    const facebook = await EnvEntryModel.find({ category: 'SOCIAL_FACEBOOK' }).lean();
    expect(facebook).toHaveLength(1);
    expect(facebook[0].config).toEqual({ app_id: 'new', app_secret: 'new' });
  });

  it('carries an inactive, non-default entry over as it was', async () => {
    await legacyEntry({ x_client_id: 'x', x_client_secret: 'y' }, { is_default: false, is_active: false, assigned_portals: [] });
    await migrateSocialAppEntries();
    const x = await EnvEntryModel.findOne({ category: 'SOCIAL_X' }).lean();
    // The first entry in a category becomes the default whatever the old flag said.
    expect(x).toMatchObject({ is_default: true, is_active: false, assigned_portals: [] });
  });

  it('does nothing when there is nothing to split', async () => {
    expect(await migrateSocialAppEntries()).toBe(0);
  });
});

describe('migrateSocialProviders', () => {
  it('moves accounts connected through the old shared Meta app to the Facebook app', async () => {
    await SocialAccountModel.collection.insertMany([
      { provider: 'META', platform: 'FACEBOOK', external_id: 'page-1', name: 'Page' },
      { provider: 'META', platform: 'INSTAGRAM', external_id: 'ig-1', name: 'Gram', meta: { page_id: 'page-1' } },
      { provider: 'LINKEDIN', platform: 'LINKEDIN', external_id: 'org-1', name: 'Org' },
    ]);
    expect(await migrateSocialProviders()).toBe(2);
    const providers = await SocialAccountModel.find().sort({ external_id: 1 }).select('provider platform').lean();
    expect(providers.map((a) => `${a.platform}:${a.provider}`)).toEqual(['INSTAGRAM:FACEBOOK', 'LINKEDIN:LINKEDIN', 'FACEBOOK:FACEBOOK']);
    expect(await migrateSocialProviders()).toBe(0);
  });
});

describe('migrateSocialApps', () => {
  it('runs both moves and reports what it did', async () => {
    await legacyEntry({ youtube_client_id: 'yt', youtube_client_secret: 'yts' });
    await SocialAccountModel.collection.insertOne({ provider: 'META', platform: 'FACEBOOK', external_id: new Types.ObjectId().toHexString(), name: 'Page' });
    expect(await migrateSocialApps()).toEqual({ entries: 1, accounts: 1 });
    expect(await migrateSocialApps()).toEqual({ entries: 0, accounts: 0 });
  });
});
