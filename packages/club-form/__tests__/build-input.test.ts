import { describe, expect, it } from 'vitest';
import {
  buildClubInput,
  cleanBullets,
  cleanFaqs,
  clubToFormValues,
  linesToMedia,
} from '../src/build-input';
import { blankClubFormValues, type ClubFormConfig, type ClubFormValues } from '../src/types';

const fullConfig: ClubFormConfig = { showAdmins: true, showVerified: true, showIsActive: true };
const bareConfig: ClubFormConfig = { showAdmins: false, showVerified: false, showIsActive: false };

function values(overrides: Partial<ClubFormValues> = {}): ClubFormValues {
  return { ...blankClubFormValues, ...overrides };
}

describe('linesToMedia', () => {
  it('classifies each non-empty URL as image or video by extension', () => {
    const out = linesToMedia('  https://x/a.jpg \n\n https://x/b.MP4 \n https://x/c.mov \nhttps://x/d.webm');
    expect(out).toEqual([
      { url: 'https://x/a.jpg', type: 'IMAGE' },
      { url: 'https://x/b.MP4', type: 'VIDEO' },
      { url: 'https://x/c.mov', type: 'VIDEO' },
      { url: 'https://x/d.webm', type: 'VIDEO' },
    ]);
  });

  it('returns an empty list for blank text', () => {
    expect(linesToMedia('  \n  ')).toEqual([]);
  });
});

describe('cleanBullets', () => {
  it('trims and drops blank entries', () => {
    expect(cleanBullets(['  a ', '', '   ', 'b'])).toEqual(['a', 'b']);
  });
});

describe('cleanFaqs', () => {
  it('trims pairs and drops any missing a question or answer', () => {
    expect(
      cleanFaqs([
        { question: ' Q1 ', answer: ' A1 ' },
        { question: '', answer: 'A2' },
        { question: 'Q3', answer: '  ' },
      ]),
    ).toEqual([{ question: 'Q1', answer: 'A1' }]);
  });
});

describe('buildClubInput', () => {
  it('maps a create draft (draft=true) with empty scalars to nulls/undefined', () => {
    const input = buildClubInput(
      values({
        club_name: '  New Club  ',
        club_description: 'desc',
        feature_text: 'https://x/a.jpg',
        moments_text: 'https://x/m.mp4',
        who_we_are: [' who '],
        what_we_do: ['do'],
        perks: ['p'],
        values: ['v'],
        faqs: [{ question: 'q', answer: 'a' }],
      }),
      { draft: true, config: bareConfig },
    );

    expect(input).toEqual({
      club_name: 'New Club',
      club_description: 'desc',
      club_feature_images_and_videos: [{ url: 'https://x/a.jpg', type: 'IMAGE' }],
      club_moments: [{ url: 'https://x/m.mp4', type: 'VIDEO' }],
      club_whats_app_community_link: '',
      club_whats_app_group_link: '',
      who_we_are: ['who'],
      what_we_do: ['do'],
      perks: ['p'],
      values: ['v'],
      faqs: [{ question: 'q', answer: 'a' }],
      location_id: null,
      locality: '',
      category_id: null,
      super_category_id: null,
      is_active: false,
      club_id: undefined,
    });
  });

  it('create with draft=false is active and keeps a provided club_id slug', () => {
    const input = buildClubInput(
      values({ club_name: 'C', club_id: 'slug-1', location_id: 'L', category_id: 'C1', super_category_id: 'S1' }),
      { config: bareConfig },
    );
    expect(input.is_active).toBe(true);
    expect(input.club_id).toBe('slug-1');
    expect(input.location_id).toBe('L');
    expect(input.category_id).toBe('C1');
    expect(input.super_category_id).toBe('S1');
    expect('admin_user_ids' in input).toBe(false);
    expect('is_verified' in input).toBe(false);
  });

  it('edit keeps the toggled is_active and omits club_id, includes governance when configured', () => {
    const input = buildClubInput(
      values({
        id: 'club-mongo-id',
        club_name: 'Edited',
        is_active: false,
        is_verified: true,
        admin_user_ids: ['u1', 'u2'],
      }),
      { config: fullConfig },
    );
    expect(input.is_active).toBe(false);
    expect('club_id' in input).toBe(false);
    expect(input.admin_user_ids).toEqual(['u1', 'u2']);
    expect(input.is_verified).toBe(true);
  });
});

describe('clubToFormValues', () => {
  it('maps a populated club document into form values', () => {
    const form = clubToFormValues({
      id: 'id1',
      club_id: 'slug',
      club_name: 'Name',
      club_description: 'Desc',
      super_category_id: 'S1',
      category_id: 'C1',
      location_id: 'L1',
      locality: 'Loc',
      club_feature_images_and_videos: [{ url: 'https://x/a.jpg' }, { url: 'https://x/b.mp4' }],
      club_moments: [{ url: 'https://x/m.jpg' }],
      club_whats_app_community_link: 'https://community',
      club_whats_app_group_link: 'https://group',
      who_we_are: ['w'],
      what_we_do: ['d'],
      perks: ['p'],
      values: ['v'],
      faqs: [{ question: 'q', answer: 'a' }],
      admin_user_ids: ['u1'],
      is_verified: true,
      is_active: false,
    });

    expect(form).toMatchObject({
      id: 'id1',
      club_id: 'slug',
      club_name: 'Name',
      feature_text: 'https://x/a.jpg\nhttps://x/b.mp4',
      moments_text: 'https://x/m.jpg',
      community_link: 'https://community',
      group_link: 'https://group',
      faqs: [{ question: 'q', answer: 'a' }],
      admin_user_ids: ['u1'],
      is_verified: true,
      is_active: false,
    });
  });

  it('applies defaults for a sparse club (nullish branches)', () => {
    const form = clubToFormValues({ id: 'only-id' });
    expect(form).toMatchObject({
      id: 'only-id',
      club_id: '',
      club_name: '',
      club_description: '',
      super_category_id: '',
      category_id: '',
      location_id: '',
      locality: '',
      feature_text: '',
      moments_text: '',
      community_link: '',
      group_link: '',
      who_we_are: [],
      what_we_do: [],
      perks: [],
      values: [],
      faqs: [],
      admin_user_ids: [],
      is_verified: false,
      is_active: true,
    });
  });
});
