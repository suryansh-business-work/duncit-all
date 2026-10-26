import {
  LISTING_LIMITS,
  appStoreCategories,
  getStoreListing,
  pubStoreListing,
  publicAppScreenshots,
  requireAppleListing,
  requirePlayListing,
  updateStoreListing,
} from '../../storeListing.service';
import { StoreListingModel } from '../../storeListing.model';
import { ascToken } from '../../appStoreConnect.gateway';
import { listCategories } from '../../ascListing.gateway';
import { readAscConfig } from '../../iosSigning.service';
import { logs } from '@observability/log';

jest.mock('../../storeListing.model', () => ({ StoreListingModel: { findOneAndUpdate: jest.fn(), findOne: jest.fn() } }));
jest.mock('../../appStoreConnect.gateway', () => ({ ascToken: jest.fn() }));
jest.mock('../../ascListing.gateway', () => ({ listCategories: jest.fn() }));
jest.mock('../../iosSigning.service', () => ({ readAscConfig: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn() } } }));

/** A listing document: plain fields plus mongoose's `set` and `save`. */
function fakeDoc(over: Record<string, unknown> = {}) {
  const doc: Record<string, any> = {
    locale: 'en-US', copyright: '', demo_account_required: false, ...over,
    set(field: string, value: unknown) {
      doc[field] = value;
    },
    save: jest.fn().mockResolvedValue(undefined),
  };
  return doc as any;
}
const withDoc = (doc: unknown) => (StoreListingModel.findOneAndUpdate as jest.Mock).mockResolvedValue(doc);
const rejection = (code = 'BAD_USER_INPUT') => ({ extensions: { code } });

describe('getStoreListing', () => {
  it('upserts the singleton so the first ask creates it empty', async () => {
    const doc = fakeDoc();
    withDoc(doc);
    await expect(getStoreListing()).resolves.toBe(doc);
    expect(StoreListingModel.findOneAndUpdate).toHaveBeenCalledWith(
      { singleton_key: 'store_listing' },
      { $setOnInsert: { singleton_key: 'store_listing' } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  });
});

describe('publicAppScreenshots', () => {
  const lean = (value: unknown) =>
    (StoreListingModel.findOne as jest.Mock).mockReturnValue({ select: () => ({ lean: () => Promise.resolve(value) }) });

  it('returns only https urls', async () => {
    lean({ website_screenshots: ['https://a/1.png', 'http://a/2.png', 'not a url', 'https://b/3.png'] });
    await expect(publicAppScreenshots()).resolves.toEqual(['https://a/1.png', 'https://b/3.png']);
    expect(StoreListingModel.findOne).toHaveBeenCalledWith({ singleton_key: 'store_listing' });
  });

  it('is empty when there is no listing or no screenshots', async () => {
    lean(null);
    await expect(publicAppScreenshots()).resolves.toEqual([]);
    lean({});
    await expect(publicAppScreenshots()).resolves.toEqual([]);
  });
});

describe('updateStoreListing: text fields', () => {
  it('trims and stores sent fields, leaves unsent ones, defaults locale and records who saved', async () => {
    const doc = fakeDoc({ locale: '', name: 'Old', subtitle: 'Keep' });
    withDoc(doc);
    const saved = await updateStoreListing({ name: '  Duncit  ', whats_new: 5, description: { x: 1 } }, 'admin@duncit.com');
    expect(saved).toBe(doc);
    expect(doc).toMatchObject({ name: 'Duncit', whats_new: '5', description: '', subtitle: 'Keep', locale: 'en-US', updated_by: 'admin@duncit.com' });
    expect(doc.save).toHaveBeenCalledTimes(1);
    expect(logs.server.warn).toHaveBeenCalledWith('appBuild', 'storeListingSaved', { by: 'admin@duncit.com' });
  });

  it('keeps an existing locale', async () => {
    const doc = fakeDoc({ locale: 'en-GB' });
    withDoc(doc);
    await updateStoreListing({}, 'a');
    expect(doc.locale).toBe('en-GB');
  });

  it('accepts a value exactly at the limit and refuses one over it, saving nothing', async () => {
    const doc = fakeDoc();
    withDoc(doc);
    await updateStoreListing({ name: 'x'.repeat(LISTING_LIMITS.name) }, 'a');
    expect(doc.save).toHaveBeenCalledTimes(1);
    await expect(updateStoreListing({ subtitle: 'x'.repeat(31) }, 'a')).rejects.toMatchObject({
      message: 'subtitle is 31 characters; the stores allow 30.', ...rejection(),
    });
    expect(doc.save).toHaveBeenCalledTimes(1);
  });

  it.each(['visit https://duncit.com', 'www.duncit.com', '2026 duncit.com', 'http://x'])('refuses a copyright carrying a web address (%s)', async (copyright) => {
    withDoc(fakeDoc());
    await expect(updateStoreListing({ copyright }, 'a')).rejects.toMatchObject({
      message: expect.stringContaining('copyright must not contain a URL'), ...rejection(),
    });
  });

  it('accepts a plain copyright line', async () => {
    const doc = fakeDoc();
    withDoc(doc);
    await updateStoreListing({ copyright: '2026 Duncit' }, 'a');
    expect(doc.copyright).toBe('2026 Duncit');
  });
});

describe('updateStoreListing: urls, lists and plain fields', () => {
  it('requires https for link fields, allows clearing them', async () => {
    const doc = fakeDoc({ support_url: 'https://old' });
    withDoc(doc);
    await updateStoreListing({ privacy_policy_url: ' https://p.example ', support_url: '   ' }, 'a');
    expect(doc).toMatchObject({ privacy_policy_url: 'https://p.example', support_url: '' });
    await expect(updateStoreListing({ marketing_url: 'http://insecure' }, 'a')).rejects.toMatchObject({
      message: 'marketing_url must be an https URL.', ...rejection(),
    });
    await expect(updateStoreListing({ android_icon: 'nonsense' }, 'a')).rejects.toMatchObject(rejection());
  });

  it('stores cleaned image lists, dropping blanks and nulls', async () => {
    const doc = fakeDoc();
    withDoc(doc);
    await updateStoreListing({ iphone_screenshots: [' https://a/1.png ', '', null, 'https://a/2.png'] }, 'a');
    expect(doc.iphone_screenshots).toEqual(['https://a/1.png', 'https://a/2.png']);
  });

  it('refuses a list that is not a list, holds a non-https item, or is over the store cap', async () => {
    withDoc(fakeDoc());
    await expect(updateStoreListing({ ipad_screenshots: 'x' }, 'a')).rejects.toMatchObject({
      message: 'ipad_screenshots must be a list of image URLs.', ...rejection(),
    });
    await expect(updateStoreListing({ ipad_screenshots: ['http://x/1.png'] }, 'a')).rejects.toMatchObject({
      message: 'ipad_screenshots holds something that is not an https URL: http://x/1.png',
    });
    const eleven = Array.from({ length: 11 }, (_, i) => `https://a/${i}.png`);
    await expect(updateStoreListing({ iphone_screenshots: eleven }, 'a')).rejects.toMatchObject({
      message: 'iphone_screenshots has 11 images; the store allows 10.',
    });
  });

  it('caps the android and website lists at eight, the iOS lists at ten', async () => {
    const doc = fakeDoc();
    withDoc(doc);
    const nine = Array.from({ length: 9 }, (_, i) => `https://a/${i}.png`);
    await expect(updateStoreListing({ android_phone_screenshots: nine }, 'a')).rejects.toMatchObject({
      message: 'android_phone_screenshots has 9 images; the store allows 8.',
    });
    await expect(updateStoreListing({ website_screenshots: nine }, 'a')).rejects.toMatchObject({
      message: 'website_screenshots has 9 images; the store allows 8.',
    });
    await updateStoreListing({ ipad_screenshots: nine }, 'a');
    expect(doc.ipad_screenshots).toHaveLength(9);
  });

  it('stores plain fields as trimmed text and the demo-account flag as a boolean', async () => {
    const doc = fakeDoc();
    withDoc(doc);
    await updateStoreListing({ contact_email: ' a@b.com ', review_first_name: 12, demo_account_required: 'yes' }, 'a');
    expect(doc).toMatchObject({ contact_email: 'a@b.com', review_first_name: '12', demo_account_required: true });
    await updateStoreListing({ demo_account_required: 0 }, 'a');
    expect(doc.demo_account_required).toBe(false);
  });
});

describe('pubStoreListing', () => {
  it('maps every field, defaulting the locale, lists and update time', () => {
    const out = pubStoreListing({ name: 'N', updated_by: 'u' } as never);
    expect(out).toMatchObject({
      locale: 'en-US', name: 'N', updated_by: 'u', updated_at: null,
      iphone_screenshots: [], ipad_screenshots: [], android_phone_screenshots: [],
      android_tablet_7_screenshots: [], android_tablet_10_screenshots: [], website_screenshots: [],
    });
  });

  it('keeps stored lists, locale and the ISO update time', () => {
    const out = pubStoreListing({
      locale: 'en-GB', iphone_screenshots: ['https://a'], demo_account_password: 'pw', updated_at: new Date('2026-01-02T03:04:05Z'),
    } as never);
    expect(out).toMatchObject({ locale: 'en-GB', iphone_screenshots: ['https://a'], demo_account_password: 'pw', updated_at: '2026-01-02T03:04:05.000Z' });
  });
});

describe('appStoreCategories', () => {
  it('is empty until the App Store Connect key is configured', async () => {
    (readAscConfig as jest.Mock).mockResolvedValue(null);
    await expect(appStoreCategories()).resolves.toEqual([]);
    expect(listCategories).not.toHaveBeenCalled();
  });

  it('lists categories with a token built from the configured credentials', async () => {
    (readAscConfig as jest.Mock).mockResolvedValue({ creds: { key: 'k' } });
    (ascToken as jest.Mock).mockReturnValue('jwt');
    (listCategories as jest.Mock).mockResolvedValue(['GAMES']);
    await expect(appStoreCategories()).resolves.toEqual(['GAMES']);
    expect(ascToken).toHaveBeenCalledWith({ key: 'k' });
    expect(listCategories).toHaveBeenCalledWith('jwt');
  });
});

describe('requireAppleListing', () => {
  const complete = () => ({
    name: 'N', description: 'D', privacy_policy_url: 'https://p', support_url: 'https://s', copyright: '2026 Duncit',
    primary_category: 'LIFESTYLE', contact_email: 'a@b.com', contact_phone: '+1', review_first_name: 'A', review_last_name: 'B',
    iphone_screenshots: ['https://i'], ipad_screenshots: ['https://p'], demo_account_required: false,
  });

  it('returns a complete listing', () => {
    const doc = complete();
    expect(requireAppleListing(doc as never)).toBe(doc);
  });

  it('names every empty required field, treating whitespace as empty', () => {
    expect(() => requireAppleListing({ name: '   ', demo_account_required: false } as never)).toThrow(
      'Store Listing is missing what the App Store needs: name, description, privacy policy URL, support URL, copyright, primary category, contact email, contact phone, review contact first name, review contact last name, iPhone screenshots, iPad screenshots. Fill it in Tech → App Builds → Store Listing.'
    );
  });

  it('asks for the demo account when App Review needs one and it is incomplete', () => {
    const base = { ...complete(), demo_account_required: true };
    expect(() => requireAppleListing({ ...base, demo_account_name: 'x' } as never)).toThrow('demo account (or untick');
    expect(() => requireAppleListing({ ...base, demo_account_password: 'x' } as never)).toThrow('demo account (or untick');
    expect(requireAppleListing({ ...base, demo_account_name: 'x', demo_account_password: 'y' } as never)).toBeTruthy();
  });

  it('refuses a stored copyright that carries a web address', () => {
    expect(() => requireAppleListing({ ...complete(), copyright: '2026 duncit.com' } as never)).toThrow('copyright must not contain a URL');
  });
});

describe('requirePlayListing', () => {
  const complete = () => ({
    name: 'N', short_description: 's', description: 'd', contact_email: 'a@b.com',
    android_phone_screenshots: ['https://1', 'https://2'], android_feature_graphic: 'https://f', android_icon: 'https://i',
  });

  it('returns a complete listing', () => {
    const doc = complete();
    expect(requirePlayListing(doc as never)).toBe(doc);
  });

  it('names every missing field, and wants at least two phone screenshots', () => {
    expect(() => requirePlayListing({} as never)).toThrow(
      'Store Listing is missing what Google Play needs: name, short description, description, contact email, at least 2 Android phone screenshots, feature graphic, app icon.'
    );
    expect(() => requirePlayListing({ ...complete(), android_phone_screenshots: ['https://1'] } as never)).toThrow('at least 2 Android phone screenshots');
  });
});
