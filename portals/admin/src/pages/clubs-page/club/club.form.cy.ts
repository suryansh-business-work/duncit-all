import { describe, expect, it } from 'vitest';
import {
  blankClubFormValues,
  buildClubInput,
  clubToFormValues,
  makeClubSchema,
  type ClubFormConfig,
  type ClubFormValues,
} from '@duncit/club-form';

const adminConfig: ClubFormConfig = {
  showAdmins: true,
  showVerified: true,
  showIsActive: true,
};

const schema = makeClubSchema(adminConfig);

const validClub: ClubFormValues = {
  ...blankClubFormValues,
  club_name: 'Bengaluru Hikers',
  club_description: 'Sunday hikes around the city.',
  super_category_id: 'super-1',
  category_id: 'sub-1',
  location_id: 'loc-1',
  locality: 'Indiranagar',
  feature_text: 'https://cdn.example.com/cover.jpg',
  community_link: 'https://chat.whatsapp.com/community',
  group_link: 'https://chat.whatsapp.com/group',
  who_we_are: ['Weekend explorers'],
  what_we_do: ['We hike every Sunday'],
  perks: ['Free trail snacks'],
  values: ['Leave no trace'],
};

const messagesFor = (input: ClubFormValues) => {
  const result = schema.safeParse(input);
  return result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');
};

describe('makeClubSchema (admin config)', () => {
  it('accepts a fully valid club', () => {
    expect(schema.safeParse(validClub).success).toBe(true);
  });

  it('rejects empty club name', () => {
    expect(messagesFor({ ...validClub, club_name: '  ' })).toMatch(/club name is required/i);
  });

  it('rejects a missing description', () => {
    expect(messagesFor({ ...validClub, club_description: '' })).toMatch(/short description is required/i);
  });

  it('requires super + sub category and a location', () => {
    expect(messagesFor({ ...validClub, super_category_id: '' })).toMatch(/super category/i);
    expect(messagesFor({ ...validClub, category_id: '' })).toMatch(/sub category/i);
    expect(messagesFor({ ...validClub, location_id: '' })).toMatch(/club location/i);
  });

  it('requires at least one feature image', () => {
    expect(messagesFor({ ...validClub, feature_text: '' })).toMatch(/at least one feature image/i);
  });

  it('rejects blank or malformed WhatsApp links', () => {
    expect(messagesFor({ ...validClub, community_link: '' })).toMatch(/community link is required/i);
    expect(messagesFor({ ...validClub, community_link: 'javascript:alert(1)' })).toMatch(/valid link/i);
    expect(messagesFor({ ...validClub, group_link: '' })).toMatch(/group link is required/i);
    expect(messagesFor({ ...validClub, group_link: 'not-a-link' })).toMatch(/valid link/i);
  });

  it('requires at least one entry in each page-content list', () => {
    expect(messagesFor({ ...validClub, who_we_are: [] })).toMatch(/who we are/i);
    expect(messagesFor({ ...validClub, what_we_do: ['  '] })).toMatch(/what we do/i);
    expect(messagesFor({ ...validClub, perks: [] })).toMatch(/at least one perk/i);
    expect(messagesFor({ ...validClub, values: [] })).toMatch(/at least one value/i);
  });
});

describe('buildClubInput', () => {
  it('maps media text and bullets into the GraphQL shape (create)', () => {
    const input = buildClubInput(validClub, { config: adminConfig }) as Record<string, any>;
    expect(input.club_feature_images_and_videos).toEqual([
      { url: 'https://cdn.example.com/cover.jpg', type: 'IMAGE' },
    ]);
    expect(input.who_we_are).toEqual(['Weekend explorers']);
    expect(input.super_category_id).toBe('super-1');
    expect(input.category_id).toBe('sub-1');
    expect(input.location_id).toBe('loc-1');
  });

  it('flags a video url by extension', () => {
    const input = buildClubInput(
      { ...validClub, feature_text: 'https://cdn.example.com/clip.mp4' },
      { config: adminConfig },
    ) as Record<string, any>;
    expect(input.club_feature_images_and_videos[0].type).toBe('VIDEO');
  });

  it('drops incomplete FAQs and empty bullets', () => {
    const input = buildClubInput(
      {
        ...validClub,
        perks: ['Snacks', '  '],
        faqs: [
          { question: 'When?', answer: 'Sundays' },
          { question: '', answer: 'orphan' },
        ],
      },
      { config: adminConfig },
    ) as Record<string, any>;
    expect(input.perks).toEqual(['Snacks']);
    expect(input.faqs).toEqual([{ question: 'When?', answer: 'Sundays' }]);
  });

  it('create draft stays inactive; create publish is active', () => {
    expect((buildClubInput(validClub, { config: adminConfig, draft: true }) as any).is_active).toBe(false);
    expect((buildClubInput(validClub, { config: adminConfig, draft: false }) as any).is_active).toBe(true);
    expect((buildClubInput(validClub, { config: adminConfig }) as any).club_id).toBeUndefined();
  });

  it('edit keeps the toggled is_active and omits club_id', () => {
    const input = buildClubInput(
      { ...validClub, id: 'club-doc-1', is_active: false },
      { config: adminConfig },
    ) as Record<string, any>;
    expect(input.is_active).toBe(false);
    expect('club_id' in input).toBe(false);
  });

  it('gates admin_user_ids and is_verified behind their config flags', () => {
    const withGov = buildClubInput(
      { ...validClub, admin_user_ids: ['u1'], is_verified: true },
      { config: adminConfig },
    ) as Record<string, any>;
    expect(withGov.admin_user_ids).toEqual(['u1']);
    expect(withGov.is_verified).toBe(true);

    const partnerConfig: ClubFormConfig = { showAdmins: false, showVerified: false, showIsActive: false };
    const noGov = buildClubInput(
      { ...validClub, admin_user_ids: ['u1'], is_verified: true },
      { config: partnerConfig },
    ) as Record<string, any>;
    expect('admin_user_ids' in noGov).toBe(false);
    expect('is_verified' in noGov).toBe(false);
  });
});

describe('clubToFormValues', () => {
  it('hydrates scalar ids, media text and admins from a Club', () => {
    const values = clubToFormValues({
      id: 'club-doc-1',
      club_id: 'bengaluru-hikers',
      club_name: 'Bengaluru Hikers',
      super_category_id: 'super-1',
      category_id: 'sub-1',
      location_id: 'loc-1',
      locality: 'Indiranagar',
      club_feature_images_and_videos: [{ url: 'https://cdn.example.com/cover.jpg', type: 'IMAGE' }],
      club_whats_app_community_link: 'https://chat.whatsapp.com/community',
      admin_user_ids: ['u1'],
      is_verified: true,
      is_active: false,
    });
    expect(values.id).toBe('club-doc-1');
    expect(values.super_category_id).toBe('super-1');
    expect(values.feature_text).toBe('https://cdn.example.com/cover.jpg');
    expect(values.community_link).toBe('https://chat.whatsapp.com/community');
    expect(values.admin_user_ids).toEqual(['u1']);
    expect(values.is_verified).toBe(true);
    expect(values.is_active).toBe(false);
  });
});
