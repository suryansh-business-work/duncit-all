import {
  attachBuild,
  editableAppInfo,
  ensureAppStoreVersion,
  listCategories,
  setPrimaryCategory,
  upsertAppInfoLocalization,
  upsertReviewDetail,
  upsertVersionLocalization,
  type AppleListing,
  type AppleReviewContact,
} from '../../ascListing.gateway';
import { asc, AscError } from '../../appStoreConnect.gateway';

jest.mock('../../appStoreConnect.gateway', () => ({
  ...jest.requireActual('../../appStoreConnect.gateway'),
  asc: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const get = asc.get as jest.Mock;
const post = asc.post as jest.Mock;
const patch = asc.patch as jest.Mock;

const review: AppleReviewContact = {
  contactFirstName: 'Asha', contactLastName: 'Rao', contactEmail: 'a@duncit.com', contactPhone: '+91 99999',
  demoAccountName: 'demo', demoAccountPassword: 'pw', demoAccountRequired: true, notes: 'Use the demo login',
};
const listing = (over: Partial<AppleListing> = {}): AppleListing => ({
  locale: 'en-US', name: 'Duncit', subtitle: 'Meet people', privacyPolicyUrl: 'https://duncit.com/privacy', primaryCategory: 'LIFESTYLE',
  copyright: '2026 Duncit', description: 'Desc', keywords: 'a,b', whatsNew: 'Fixes', supportUrl: 'https://duncit.com/support',
  marketingUrl: 'https://duncit.com', review, ...over,
});

describe('editableAppInfo', () => {
  it.each(['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY'])('prefers a record in the editable state %s', async (state) => {
    get.mockResolvedValue({ data: [{ id: 'live', attributes: { state: 'READY_FOR_SALE' } }, { id: 'draft', attributes: { state } }] });
    await expect(editableAppInfo('t', 'app1')).resolves.toBe('draft');
    expect(get).toHaveBeenCalledWith('t', '/apps/app1/appInfos?limit=10');
  });

  it('reads the state under any of the three names Apple uses', async () => {
    get.mockResolvedValue({ data: [{ id: 'a', attributes: { appVersionState: 'READY_FOR_SALE' } }, { id: 'b', attributes: { appStoreState: 'REJECTED' } }] });
    await expect(editableAppInfo('t', 'app1')).resolves.toBe('b');
  });

  it('falls back to the first record when none is editable', async () => {
    get.mockResolvedValue({ data: [{ id: 'first', attributes: {} }, { id: 'second' }] });
    await expect(editableAppInfo('t', 'app1')).resolves.toBe('first');
  });

  it('fails when the app has no app-info record at all', async () => {
    get.mockResolvedValue({ data: [] });
    await expect(editableAppInfo('t', 'app1')).rejects.toThrow('App Store Connect has no app information record for this app yet.');
    get.mockResolvedValue({});
    await expect(editableAppInfo('t', 'app1')).rejects.toThrow('no app information record');
  });
});

describe('upsertAppInfoLocalization', () => {
  it('updates the locale that exists, sending only the non-empty fields', async () => {
    get.mockResolvedValue({ data: [{ id: 'x', attributes: { locale: 'fr-FR' } }, { id: 'loc1', attributes: { locale: 'en-US' } }] });
    await upsertAppInfoLocalization('t', 'ai1', listing({ subtitle: '' }));
    expect(patch).toHaveBeenCalledWith('t', '/appInfoLocalizations/loc1', {
      type: 'appInfoLocalizations', id: 'loc1', attributes: { name: 'Duncit', privacyPolicyUrl: 'https://duncit.com/privacy' },
    });
    expect(post).not.toHaveBeenCalled();
  });

  it('creates the locale when Apple has none', async () => {
    get.mockResolvedValue({ data: [] });
    await upsertAppInfoLocalization('t', 'ai1', listing());
    expect(post).toHaveBeenCalledWith('t', '/appInfoLocalizations', {
      type: 'appInfoLocalizations',
      attributes: { name: 'Duncit', subtitle: 'Meet people', privacyPolicyUrl: 'https://duncit.com/privacy', locale: 'en-US' },
      relationships: { appInfo: { data: { type: 'appInfos', id: 'ai1' } } },
    });
    expect(patch).not.toHaveBeenCalled();
  });

  it('creates when Apple returns no list', async () => {
    get.mockResolvedValue({});
    await upsertAppInfoLocalization('t', 'ai1', listing());
    expect(post).toHaveBeenCalledTimes(1);
  });
});

describe('setPrimaryCategory', () => {
  it('points the app-info record at the category', async () => {
    await setPrimaryCategory('t', 'ai1', 'LIFESTYLE');
    expect(patch).toHaveBeenCalledWith('t', '/appInfos/ai1', {
      type: 'appInfos', id: 'ai1', relationships: { primaryCategory: { data: { type: 'appCategories', id: 'LIFESTYLE' } } },
    });
  });
});

describe('ensureAppStoreVersion', () => {
  const expectedAttributes = { versionString: '1.3.0', copyright: '2026 Duncit', releaseType: 'AFTER_APPROVAL' };

  it('renames the editable version and reports it is not the first when others exist', async () => {
    get.mockResolvedValue({ data: [{ id: 'live', attributes: { appVersionState: 'READY_FOR_SALE' } }, { id: 'draft', attributes: { appStoreState: 'PREPARE_FOR_SUBMISSION' } }] });
    await expect(ensureAppStoreVersion('t', 'app1', '1.3.0', '2026 Duncit')).resolves.toEqual({ id: 'draft', first: false });
    expect(patch).toHaveBeenCalledWith('t', '/appStoreVersions/draft', { type: 'appStoreVersions', id: 'draft', attributes: expectedAttributes });
    expect(post).not.toHaveBeenCalled();
  });

  it('is the app’s first version when the editable one is the only one', async () => {
    get.mockResolvedValue({ data: [{ id: 'draft', attributes: { state: 'PREPARE_FOR_SUBMISSION' } }] });
    await expect(ensureAppStoreVersion('t', 'app1', '1.0.0', 'c')).resolves.toEqual({ id: 'draft', first: true });
  });

  it('creates a version when none is editable, released after approval', async () => {
    get.mockResolvedValue({ data: [{ id: 'live', attributes: { appVersionState: 'READY_FOR_SALE' } }] });
    post.mockResolvedValue({ data: { id: 77 } });
    await expect(ensureAppStoreVersion('t', 'app1', '1.3.0', '2026 Duncit')).resolves.toEqual({ id: '77', first: false });
    expect(post).toHaveBeenCalledWith('t', '/appStoreVersions', {
      type: 'appStoreVersions',
      attributes: { platform: 'IOS', ...expectedAttributes },
      relationships: { app: { data: { type: 'apps', id: 'app1' } } },
    });
  });

  it('creates the first version of an app that has none, tolerating a non-list answer', async () => {
    get.mockResolvedValue({});
    post.mockResolvedValue({ data: { id: 'v1' } });
    await expect(ensureAppStoreVersion('t', 'app1', '1.0.0', 'c')).resolves.toEqual({ id: 'v1', first: true });
    expect(get.mock.calls[0][1]).toContain('/apps/app1/appStoreVersions?');
  });
});

describe('attachBuild', () => {
  it('points the version at the processed build', async () => {
    await attachBuild('t', 'v1', 'b1');
    expect(patch).toHaveBeenCalledWith('t', '/appStoreVersions/v1/relationships/build', { type: 'builds', id: 'b1' });
  });
});

describe('upsertVersionLocalization', () => {
  it('updates the existing locale with the non-empty fields and returns its id', async () => {
    get.mockResolvedValue({ data: [{ id: 9, attributes: { locale: 'en-US' } }] });
    await expect(upsertVersionLocalization('t', 'v1', listing({ marketingUrl: '', whatsNew: '' }))).resolves.toBe('9');
    expect(patch).toHaveBeenCalledWith('t', '/appStoreVersionLocalizations/9', {
      type: 'appStoreVersionLocalizations', id: '9',
      attributes: { description: 'Desc', keywords: 'a,b', supportUrl: 'https://duncit.com/support' },
    });
  });

  it('creates the locale on the version when missing and returns its id', async () => {
    get.mockResolvedValue({ data: [{ id: 1, attributes: { locale: 'fr-FR' } }] });
    post.mockResolvedValue({ data: { id: 55 } });
    await expect(upsertVersionLocalization('t', 'v1', listing())).resolves.toBe('55');
    expect(post).toHaveBeenCalledWith('t', '/appStoreVersionLocalizations', expect.objectContaining({
      attributes: expect.objectContaining({ locale: 'en-US', whatsNew: 'Fixes' }),
      relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: 'v1' } } },
    }));
  });
});

describe('upsertReviewDetail', () => {
  it('updates the version’s review detail when Apple has one', async () => {
    get.mockResolvedValue({ data: { id: 'rd1' } });
    await upsertReviewDetail('t', 'v1', { ...review, demoAccountName: '', notes: '', demoAccountRequired: false });
    expect(patch).toHaveBeenCalledWith('t', '/appStoreReviewDetails/rd1', {
      type: 'appStoreReviewDetails', id: 'rd1',
      attributes: {
        contactFirstName: 'Asha', contactLastName: 'Rao', contactEmail: 'a@duncit.com', contactPhone: '+91 99999',
        demoAccountPassword: 'pw', demoAccountRequired: false,
      },
    });
  });

  it('creates the review detail when Apple answers 404 or an empty record', async () => {
    get.mockRejectedValueOnce(new AscError(404, 'not found'));
    await upsertReviewDetail('t', 'v1', review);
    expect(post).toHaveBeenCalledWith('t', '/appStoreReviewDetails', {
      type: 'appStoreReviewDetails',
      attributes: expect.objectContaining({ demoAccountRequired: true, notes: 'Use the demo login' }),
      relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: 'v1' } } },
    });
    get.mockResolvedValueOnce({ data: null });
    await upsertReviewDetail('t', 'v1', review);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('does not hide any other failure', async () => {
    get.mockRejectedValueOnce(new AscError(500, 'down'));
    await expect(upsertReviewDetail('t', 'v1', review)).rejects.toMatchObject({ status: 500 });
    get.mockRejectedValueOnce(new Error('network'));
    await expect(upsertReviewDetail('t', 'v1', review)).rejects.toThrow('network');
    expect(post).not.toHaveBeenCalled();
  });
});

describe('listCategories', () => {
  it('returns the top-level iOS category ids, sorted', async () => {
    get.mockResolvedValue({ data: [{ id: 'SOCIAL_NETWORKING' }, { id: 'GAMES' }, { id: 'LIFESTYLE' }] });
    await expect(listCategories('t')).resolves.toEqual(['GAMES', 'LIFESTYLE', 'SOCIAL_NETWORKING']);
    expect(get.mock.calls[0][1]).toContain('exists%5Bparent%5D=false');
  });

  it('is empty for a non-list answer', async () => {
    get.mockResolvedValue({});
    await expect(listCategories('t')).resolves.toEqual([]);
  });
});
