/**
 * The banner kit form rules — one set for every portal that edits a venue's or
 * a host's kit, mirroring the server's limits. Every assertion is on a KEY.
 */
import { describe, expect, it } from 'vitest';

import {
  BANNER_KIT_LIMITS,
  isBrandColorEntry,
  isInstagramHandleEntry,
  makeBannerKitSchema,
  normalizeInstagramHandle,
  type BannerKitValues,
} from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;
const schema = makeBannerKitSchema(t);

const CDN = 'https://ik.imagekit.io/duncit';
const valid: BannerKitValues = {
  logo_url: `${CDN}/logo.png`,
  instagram_handle: 'cafe.blue',
  collab_opt_in: true,
  photos: [{ url: `${CDN}/a.jpg`, caption: 'Rooftop' }],
  event_photos: [],
  tagline: 'Games every Friday',
  bio: 'A small cafe.',
  brand_color: '#1a2b3c',
};

const messagesFor = (over: Partial<BannerKitValues>) => {
  const result = schema.safeParse({ ...valid, ...over });
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}=${issue.message}`);
};

describe('normalizeInstagramHandle', () => {
  it.each([
    ['@Duncit.Events', 'duncit.events'],
    ['  run_club-delhi ', 'run_club-delhi'],
    ['https://www.instagram.com/Cafe.Blue/', 'cafe.blue'],
    ['instagram.com/cafe.blue?igsh=x', 'cafe.blue'],
    ['https://instagram.com/cafe.blue', 'cafe.blue'],
    ['@@twice', 'twice'],
    ['', ''],
  ])('reads %j as %j, as the server stores it', (raw, handle) => {
    expect(normalizeInstagramHandle(raw)).toBe(handle);
  });
});

describe('isInstagramHandleEntry / isBrandColorEntry', () => {
  it('accepts an empty handle and a pasted link, and refuses words with spaces', () => {
    expect(isInstagramHandleEntry('')).toBe(true);
    expect(isInstagramHandleEntry('https://instagram.com/cafe.blue/')).toBe(true);
    expect(isInstagramHandleEntry('cafe blue')).toBe(false);
    expect(isInstagramHandleEntry('cafe/blue')).toBe(false);
    // Instagram has no hyphens and no leading or doubled dots.
    expect(isInstagramHandleEntry('run-club')).toBe(false);
    expect(isInstagramHandleEntry('.cafe')).toBe(false);
  });

  it('accepts no colour or six hex digits only', () => {
    expect(isBrandColorEntry('')).toBe(true);
    expect(isBrandColorEntry('#A1B2C3')).toBe(true);
    expect(isBrandColorEntry('#abc')).toBe(false);
    expect(isBrandColorEntry('red')).toBe(false);
    expect(isBrandColorEntry('#12345g')).toBe(false);
  });
});

describe('makeBannerKitSchema', () => {
  it("mirrors the server's limits", () => {
    expect(BANNER_KIT_LIMITS).toEqual({ photos: 12, eventPhotos: 12, caption: 120, tagline: 80, bio: 400 });
  });

  it('takes a complete kit, trimming the text', () => {
    expect(schema.parse({ ...valid, tagline: '  Hi  ', bio: ' Bio ', instagram_handle: ' cafe.blue ' })).toEqual({
      ...valid,
      tagline: 'Hi',
      bio: 'Bio',
      instagram_handle: 'cafe.blue',
    });
  });

  it('takes an empty kit', () => {
    expect(messagesFor({ logo_url: '', instagram_handle: '', photos: [], tagline: '', bio: '', brand_color: '' })).toEqual([]);
  });

  it('accepts exactly the limits', () => {
    const photos = Array.from({ length: 12 }, (_, i) => ({ url: `${CDN}/${i}.jpg`, caption: 'c'.repeat(120) }));
    expect(messagesFor({ photos, event_photos: photos, tagline: 't'.repeat(80), bio: 'b'.repeat(400) })).toEqual([]);
  });

  it('names each field past its limit', () => {
    const photos = Array.from({ length: 13 }, (_, i) => ({ url: `${CDN}/${i}.jpg`, caption: '' }));
    expect(messagesFor({ photos })).toEqual(['photos=shell.bannerKit.errors.photosMax:{"max":12}']);
    expect(messagesFor({ event_photos: photos })).toEqual(['event_photos=shell.bannerKit.errors.photosMax:{"max":12}']);
    expect(messagesFor({ photos: [{ url: `${CDN}/a.jpg`, caption: 'c'.repeat(121) }] })).toEqual([
      'photos.0.caption=shell.bannerKit.errors.captionMax:{"max":120}',
    ]);
    expect(messagesFor({ tagline: 't'.repeat(81) })).toEqual(['tagline=shell.bannerKit.errors.taglineMax:{"max":80}']);
    expect(messagesFor({ bio: 'b'.repeat(401) })).toEqual(['bio=shell.bannerKit.errors.bioMax:{"max":400}']);
  });

  it('refuses a malformed handle or colour', () => {
    expect(messagesFor({ instagram_handle: 'cafe blue' })).toEqual(['instagram_handle=shell.bannerKit.errors.handleInvalid']);
    expect(messagesFor({ brand_color: '#abc' })).toEqual(['brand_color=shell.bannerKit.errors.colorInvalid']);
  });

  it('refuses a photo with no picture', () => {
    expect(messagesFor({ photos: [{ url: '', caption: '' }] })).toHaveLength(1);
  });
});
