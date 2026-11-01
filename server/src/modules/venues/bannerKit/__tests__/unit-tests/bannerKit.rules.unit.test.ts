import { applyBannerKitInput, BANNER_KIT_LIMITS } from '../../bannerKit.rules';
import { blankBannerKit, type IBannerKit } from '../../bannerKit.model';
import { suggestedPhotos, toBannerKitPub, toStoredBannerKit } from '../../bannerKit.pub';
import { isSocialHandle, normalizeInstagramHandle } from '@utils/social-handle';

const CDN = 'https://ik.imagekit.io/duncit';
const photo = (n: number, caption = '') => ({ url: `${CDN}/p${n}.jpg`, caption });
const saved = (over: Partial<IBannerKit> = {}): IBannerKit => ({ ...blankBannerKit(), ...over });

describe('normalizeInstagramHandle', () => {
  it.each([
    ['@Duncit.Events', 'duncit.events'],
    ['  run_club-delhi  ', 'run_club-delhi'],
    ['https://www.instagram.com/Cafe.Blue/', 'cafe.blue'],
    ['instagram.com/cafe.blue?igsh=abc', 'cafe.blue'],
    ['@@twice', 'twice'],
    ['', ''],
  ])('reads %j as %j', (raw, handle) => {
    expect(normalizeInstagramHandle(raw)).toBe(handle);
  });

  it('leaves a non-handle for the shape check to refuse', () => {
    expect(isSocialHandle(normalizeInstagramHandle('not a handle'))).toBe(false);
    expect(isSocialHandle('cafe.blue')).toBe(true);
  });
});

describe('applyBannerKitInput', () => {
  it('keeps every stored field the input leaves out', () => {
    const current = saved({ tagline: 'Board games every Friday', instagram_handle: 'cafe.blue', collab_opt_in: false });
    expect(applyBannerKitInput(current, {})).toEqual(current);
    expect(applyBannerKitInput(current, { tagline: null, collab_opt_in: null })).toEqual(current);
  });

  it('normalises what it stores: trimmed text, lowercase handle and colour, captions kept in order', () => {
    const next = applyBannerKitInput(blankBannerKit(), {
      logo_url: ` ${CDN}/logo.png `,
      instagram_handle: 'https://instagram.com/Cafe.Blue',
      photos: [{ url: `${CDN}/a.jpg`, caption: '  Rooftop  ' }, { url: `${CDN}/b.jpg` }],
      event_photos: [photo(9, 'Quiz night')],
      tagline: '  Come as you are ',
      bio: ' A small cafe. ',
      brand_color: '#1A2B3C',
      collab_opt_in: false,
    });
    expect(next).toEqual({
      logo_url: `${CDN}/logo.png`,
      instagram_handle: 'cafe.blue',
      photos: [
        { url: `${CDN}/a.jpg`, caption: 'Rooftop' },
        { url: `${CDN}/b.jpg`, caption: '' },
      ],
      event_photos: [photo(9, 'Quiz night')],
      tagline: 'Come as you are',
      bio: 'A small cafe.',
      brand_color: '#1a2b3c',
      collab_opt_in: false,
    });
  });

  it('clears a field sent empty', () => {
    const current = saved({ logo_url: `${CDN}/logo.png`, instagram_handle: 'cafe.blue', brand_color: '#000000', photos: [photo(1)] });
    expect(applyBannerKitInput(current, { logo_url: '', instagram_handle: '', brand_color: '', photos: [] })).toEqual(blankBannerKit());
  });

  it('accepts exactly the limits', () => {
    const next = applyBannerKitInput(blankBannerKit(), {
      photos: Array.from({ length: BANNER_KIT_LIMITS.photos }, (_, i) => photo(i, 'c'.repeat(BANNER_KIT_LIMITS.caption))),
      event_photos: Array.from({ length: BANNER_KIT_LIMITS.eventPhotos }, (_, i) => photo(i)),
      tagline: 't'.repeat(BANNER_KIT_LIMITS.tagline),
      bio: 'b'.repeat(BANNER_KIT_LIMITS.bio),
    });
    expect(next.photos).toHaveLength(12);
    expect(next.event_photos).toHaveLength(12);
  });

  it.each([
    ['a logo off the media library', { logo_url: 'https://evil.example.com/logo.png' }, /logo must be uploaded/i],
    ['an http logo', { logo_url: 'http://ik.imagekit.io/duncit/logo.png' }, /logo must be uploaded/i],
    ['a photo off the media library', { photos: [{ url: 'https://evil.example.com/p.jpg' }] }, /every photo must be uploaded/i],
    ['a photo with no picture', { photos: [{ url: '  ', caption: 'x' }] }, /needs a picture/i],
    ['13 photos', { photos: Array.from({ length: 13 }, (_, i) => photo(i)) }, /at most 12 photos/i],
    ['13 event photos', { event_photos: Array.from({ length: 13 }, (_, i) => photo(i)) }, /at most 12 event photos/i],
    ['a 121-character caption', { photos: [photo(1, 'c'.repeat(121))] }, /caption can be at most 120/i],
    ['an 81-character tagline', { tagline: 't'.repeat(81) }, /tagline can be at most 80/i],
    ['a 401-character bio', { bio: 'b'.repeat(401) }, /bio can be at most 400/i],
    ['a handle with spaces', { instagram_handle: 'cafe blue' }, /instagram handle/i],
    ['a handle Instagram would not allow', { instagram_handle: 'run-club' }, /instagram handle/i],
    ['a short colour', { brand_color: '#abc' }, /brand colour/i],
    ['a colour name', { brand_color: 'red' }, /brand colour/i],
  ])('refuses %s with BAD_USER_INPUT', (_label, input, message) => {
    let caught: unknown;
    try {
      applyBannerKitInput(blankBannerKit(), input);
    } catch (err) {
      caught = err;
    }
    expect(caught).toMatchObject({ message: expect.stringMatching(message), extensions: { code: 'BAD_USER_INPUT' } });
  });
});

describe('toBannerKitPub', () => {
  const from = { logo: `${CDN}/cover.jpg`, photos: [`${CDN}/cover.jpg`, `${CDN}/g1.jpg`, `${CDN}/cover.jpg`, 'https://old.host/x.jpg', ''] };

  it('reads an old row with no kit as the defaults, prefilled from what is on file', () => {
    expect(toBannerKitPub(undefined, from)).toEqual({
      ...blankBannerKit(),
      logo_url: `${CDN}/cover.jpg`,
      photos: [
        { url: `${CDN}/cover.jpg`, caption: '' },
        { url: `${CDN}/g1.jpg`, caption: '' },
      ],
      suggested_photos: [`${CDN}/cover.jpg`, `${CDN}/g1.jpg`],
    });
  });

  it('prefills nothing when nothing on file is on the media library', () => {
    expect(toBannerKitPub(null, { logo: 'https://old.host/logo.png', photos: [] })).toEqual({
      ...blankBannerKit(),
      suggested_photos: [],
    });
  });

  it('answers a saved kit as saved, with the suggestions alongside', () => {
    const kit = saved({ tagline: 'Hello', collab_opt_in: false });
    expect(toBannerKitPub(kit, from)).toEqual({ ...kit, suggested_photos: [`${CDN}/cover.jpg`, `${CDN}/g1.jpg`] });
  });

  it('caps the suggestions at the photo limit', () => {
    expect(suggestedPhotos(Array.from({ length: 20 }, (_, i) => `${CDN}/s${i}.jpg`))).toHaveLength(BANNER_KIT_LIMITS.photos);
  });

  it('copies a partial stored kit into every field', () => {
    expect(toStoredBannerKit({ instagram_handle: 'cafe.blue', photos: [{ url: `${CDN}/a.jpg`, caption: 'A' }] })).toEqual({
      ...blankBannerKit(),
      instagram_handle: 'cafe.blue',
      photos: [{ url: `${CDN}/a.jpg`, caption: 'A' }],
    });
  });
});
