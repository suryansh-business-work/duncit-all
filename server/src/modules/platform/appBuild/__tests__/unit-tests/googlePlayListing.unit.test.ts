import { applyPlayListing, playListingOf, type PlayListing } from '../../googlePlayListing';
import { call } from '../../googlePlay.gateway';
import { fetchStoreAssets } from '../../storeAssets';

jest.mock('../../googlePlay.gateway', () => ({
  API: 'https://play.api/edits-root',
  UPLOAD_API: 'https://play.upload/root',
  auth: (token: string) => ({ Authorization: `Bearer ${token}` }),
  call: jest.fn(),
}));
jest.mock('../../storeAssets', () => ({ fetchStoreAssets: jest.fn() }));

const callMock = call as jest.Mock;

describe('playListingOf', () => {
  const doc = {
    locale: 'en-GB', name: 'Duncit', short_description: 'short', description: 'long', whats_new: 'new', contact_email: 'a@b.com',
    contact_phone: '+1', support_url: 'https://s', android_phone_screenshots: ['p1'], android_tablet_7_screenshots: ['t7'],
    android_tablet_10_screenshots: ['t10'], android_feature_graphic: 'https://fg', android_icon: 'https://icon',
  };

  it('maps the store listing into Play’s shape', () => {
    expect(playListingOf(doc as never)).toEqual({
      language: 'en-GB', title: 'Duncit', shortDescription: 'short', fullDescription: 'long', releaseNotes: 'new',
      contactEmail: 'a@b.com', contactPhone: '+1', contactWebsite: 'https://s',
      images: { phoneScreenshots: ['p1'], sevenInchScreenshots: ['t7'], tenInchScreenshots: ['t10'], featureGraphic: ['https://fg'], icon: ['https://icon'] },
    });
  });

  it('defaults the language and leaves out the single images that are not set', () => {
    const out = playListingOf({ ...doc, locale: '', android_feature_graphic: '', android_icon: '' } as never);
    expect(out.language).toBe('en-US');
    expect(out.images.featureGraphic).toEqual([]);
    expect(out.images.icon).toEqual([]);
  });
});

describe('applyPlayListing', () => {
  const listing = (over: Partial<PlayListing> = {}): PlayListing => ({
    language: 'en-US', title: 'T', shortDescription: 'S', fullDescription: 'F', releaseNotes: 'R',
    contactEmail: 'a@b.com', contactPhone: '', contactWebsite: 'https://s', images: {}, ...over,
  });
  const base = 'https://play.api/edits-root/com.duncit.app/edits/e1';

  it('writes details (blanks left out) and the listing text into the edit, with no images', async () => {
    await applyPlayListing('tok', 'com.duncit.app', 'e1', listing());
    expect(callMock).toHaveBeenCalledTimes(2);
    expect(callMock.mock.calls[0]).toEqual([
      `${base}/details`,
      { method: 'PUT', headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' }, body: JSON.stringify({ defaultLanguage: 'en-US', contactEmail: 'a@b.com', contactWebsite: 'https://s' }) },
    ]);
    expect(callMock.mock.calls[1]).toEqual([
      `${base}/listings/en-US`,
      { method: 'PUT', headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' }, body: JSON.stringify({ language: 'en-US', title: 'T', shortDescription: 'S', fullDescription: 'F' }) },
    ]);
    expect(fetchStoreAssets).not.toHaveBeenCalled();
  });

  it('replaces each image type: fetch first, then delete the old ones, then upload in order', async () => {
    (fetchStoreAssets as jest.Mock).mockResolvedValue([
      { bytes: Buffer.from('a'), contentType: 'image/png' },
      { bytes: Buffer.from('b'), contentType: 'image/jpeg' },
    ]);
    await applyPlayListing('tok', 'com.duncit.app', 'e1', listing({ images: { phoneScreenshots: ['u1', 'u2'] } }));
    expect(fetchStoreAssets).toHaveBeenCalledWith(['u1', 'u2']);
    const calls = callMock.mock.calls.slice(2);
    expect(calls[0]).toEqual([`${base}/listings/en-US/phoneScreenshots`, { method: 'DELETE', headers: { Authorization: 'Bearer tok' } }]);
    expect(calls[1]).toEqual([
      'https://play.upload/root/com.duncit.app/edits/e1/listings/en-US/phoneScreenshots?uploadType=media',
      { method: 'POST', headers: { Authorization: 'Bearer tok', 'Content-Type': 'image/png' }, body: Buffer.from('a') },
    ]);
    expect(calls[2][1]).toMatchObject({ headers: { 'Content-Type': 'image/jpeg' }, body: Buffer.from('b') });
    expect(calls).toHaveLength(3);
  });

  it('skips image types with no urls and does not touch what is already on Play', async () => {
    (fetchStoreAssets as jest.Mock).mockResolvedValue([]);
    await applyPlayListing('tok', 'p', 'e1', listing({ images: { phoneScreenshots: [], icon: undefined, featureGraphic: ['https://fg'] } }));
    expect(fetchStoreAssets).toHaveBeenCalledTimes(1);
    expect(fetchStoreAssets).toHaveBeenCalledWith(['https://fg']);
    expect(callMock.mock.calls.some((c) => String(c[0]).includes('phoneScreenshots'))).toBe(false);
  });

  it('does not delete the old images when fetching the new ones fails', async () => {
    (fetchStoreAssets as jest.Mock).mockRejectedValue(new Error('Could not fetch listing image'));
    await expect(applyPlayListing('tok', 'p', 'e1', listing({ images: { icon: ['https://i'] } }))).rejects.toThrow('Could not fetch listing image');
    expect(callMock.mock.calls.some((c) => c[1]?.method === 'DELETE')).toBe(false);
  });
});
