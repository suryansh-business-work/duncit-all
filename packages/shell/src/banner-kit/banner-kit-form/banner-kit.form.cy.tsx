import { describe, expect, it } from 'vitest';
import { makeBannerKitSchema } from '@duncit/forms/schemas';
import { toBannerKitValues } from './banner-kit.form';
import type { BannerKitData } from './banner-kit.types';

/** Reads the key and its vars back, so a message names the rule it came from. */
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key;
const schema = makeBannerKitSchema(t);

const CDN = 'https://ik.imagekit.io/duncit';
const kit: BannerKitData = {
  logo_url: `${CDN}/logo.png`,
  instagram_handle: 'cafe.blue',
  collab_opt_in: true,
  photos: [{ url: `${CDN}/a.jpg`, caption: 'Rooftop' }],
  event_photos: [],
  tagline: 'Games every Friday',
  bio: '',
  brand_color: '',
  suggested_photos: [`${CDN}/a.jpg`, `${CDN}/b.jpg`],
};

describe('the banner kit form values', () => {
  it('edit what the API answered, without the suggestions it only offers', () => {
    const values = toBannerKitValues(kit);
    expect(values).not.toHaveProperty('suggested_photos');
    expect(schema.parse(values)).toEqual(values);
  });

  it('refuse a pasted handle with spaces under its own key', () => {
    const result = schema.safeParse({ ...toBannerKitValues(kit), instagram_handle: 'cafe blue' });
    expect(result.success ? null : result.error.issues[0]?.message).toBe('shell.bannerKit.errors.handleInvalid');
  });
});
