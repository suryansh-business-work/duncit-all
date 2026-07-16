import { describe, expect, it } from 'vitest';
import { makeClubSchema } from '../src/schema';
import type { ClubFormConfig, ClubFormValues } from '../src/types';

const config: ClubFormConfig = { showAdmins: true, showVerified: true, showIsActive: true };
const schema = makeClubSchema(config);

/** A fully valid club that passes every superRefine rule. */
function validValues(): ClubFormValues {
  return {
    club_id: 'my-club',
    club_name: 'My Club',
    club_description: 'A great club',
    super_category_id: 'S1',
    category_id: 'C1',
    location_id: 'L1',
    locality: 'Andheri',
    feature_text: 'https://cdn/x.jpg',
    moments_text: '',
    community_link: 'https://chat.whatsapp.com/community',
    group_link: 'https://chat.whatsapp.com/group',
    who_we_are: ['friendly people'],
    what_we_do: ['we meet'],
    perks: ['free tea'],
    values: ['kindness'],
    faqs: [],
    admin_user_ids: [],
    is_verified: false,
    is_active: true,
  };
}

/** Assert the schema rejects `values` with an issue carrying `message`. */
function expectIssue(values: ClubFormValues, message: string) {
  const result = schema.safeParse(values);
  expect(result.success).toBe(false);
  if (result.success) return;
  const messages = result.error.issues.map((issue) => issue.message);
  expect(messages).toContain(message);
}

describe('makeClubSchema', () => {
  it('accepts a fully valid club', () => {
    const result = schema.safeParse(validValues());
    expect(result.success).toBe(true);
  });

  it('applies string/array defaults when fields are omitted', () => {
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
    // The parsed shape still exists on the issues path — defaults kicked in so
    // e.g. is_active defaulted true, arrays defaulted []. Verify a default rule
    // fired (empty club_name).
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain('Club name is required');
    }
  });

  it('requires club_name', () => {
    expectIssue({ ...validValues(), club_name: '   ' }, 'Club name is required');
  });

  it('requires club_description', () => {
    expectIssue({ ...validValues(), club_description: '' }, 'A short description is required');
  });

  it('requires super_category_id', () => {
    expectIssue({ ...validValues(), super_category_id: '' }, 'Select a super category');
  });

  it('requires category_id', () => {
    expectIssue({ ...validValues(), category_id: '' }, 'Select a sub category');
  });

  it('requires location_id', () => {
    expectIssue({ ...validValues(), location_id: '' }, 'Select the club location');
  });

  it('requires at least one feature image', () => {
    expectIssue({ ...validValues(), feature_text: '  \n  ' }, 'Add at least one feature image');
  });

  it('requires a community link', () => {
    expectIssue({ ...validValues(), community_link: '' }, 'WhatsApp community link is required');
  });

  it('rejects an invalid community link', () => {
    expectIssue({ ...validValues(), community_link: 'not-a-link' }, 'Enter a valid link (https://…)');
  });

  it('requires a group link', () => {
    expectIssue({ ...validValues(), group_link: '   ' }, 'WhatsApp group link is required');
  });

  it('rejects an invalid group link', () => {
    expectIssue({ ...validValues(), group_link: 'ftp://nope' }, 'Enter a valid link (https://…)');
  });

  it('requires a "who we are" point', () => {
    expectIssue({ ...validValues(), who_we_are: ['   ', ''] }, 'Add at least one "Who we are" point');
  });

  it('requires a "what we do" point', () => {
    expectIssue({ ...validValues(), what_we_do: [] }, 'Add at least one "What we do" point');
  });

  it('requires a perk', () => {
    expectIssue({ ...validValues(), perks: ['  '] }, 'Add at least one perk');
  });

  it('requires a value', () => {
    expectIssue({ ...validValues(), values: [] }, 'Add at least one value');
  });
});
