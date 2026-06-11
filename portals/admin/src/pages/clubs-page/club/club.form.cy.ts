import { describe, expect, it } from 'vitest';
import { clubFormSchema, toCreateClubInput, toUpdateClubInput } from './club.form';

const base = {
  club_name: 'Bengaluru Hikers',
  club_description: 'Sunday hikes around the city.',
  super_category_id: '',
  category_id: '',
  is_active: true,
  cover_image_url: '',
  banner_image_url: '',
  community_link: '',
  announcement_link: '',
  group_link: '',
  meetup_venues_id: [],
  feature_text: '',
  moments_text: '',
  moments_media: [],
};

describe('clubFormSchema', () => {
  it('rejects empty club name', async () => {
    const error = await clubFormSchema.validate({ ...base, club_name: '' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/club name/i);
  });

  it('rejects invalid URLs', async () => {
    const error = await clubFormSchema
      .validate({ ...base, community_link: 'javascript:alert(1)' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/community/i);
  });

  it('accepts a fully valid club', async () => {
    await expect(clubFormSchema.validate(base)).resolves.toBeTruthy();
  });
});

describe('toCreateClubInput', () => {
  it('nullifies empty optional links', () => {
    const input = toCreateClubInput(base);
    expect(input.community_link).toBeNull();
    expect(input.cover_image_url).toBeNull();
  });

  it('passes through array fields unchanged', () => {
    const input = toCreateClubInput({ ...base, meetup_venues_id: ['v1', 'v2'], moments_media: ['m1'] });
    expect(input.meetup_venues_id).toEqual(['v1', 'v2']);
    expect(input.moments_media).toEqual(['m1']);
  });
});

describe('toUpdateClubInput', () => {
  it('preserves is_active flag', () => {
    expect(toUpdateClubInput({ ...base, is_active: false }).is_active).toBe(false);
  });
});
