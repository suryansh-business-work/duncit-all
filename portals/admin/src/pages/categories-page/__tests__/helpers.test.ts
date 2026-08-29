import { describe, expect, it } from 'vitest';
import { buildCreateInput, buildMediaFromText, buildUpdateInput } from '../helpers';
import { blankForm, type FormState } from '../queries';

// category-input.form.cy.ts already covers the CATEGORY-level icon-layout
// "mweb set / native null" combination and the SUPER/SUB "never carries icon
// layout" guard. This file fills in the branches that leaves untouched:
// buildMediaFromText with real content, the mirrored "native set / mweb null"
// and "neither set" icon-layout combinations, and buildCreateInput's own
// SUB-category branch (only buildUpdateInput's SUB branch was exercised there).
describe('buildMediaFromText', () => {
  it('detects video extensions case-insensitively and defaults everything else to IMAGE', () => {
    const media = buildMediaFromText('https://x/a.MP4\nhttps://x/b.mov\nhttps://x/c.webm\nhttps://x/d.png');
    expect(media).toEqual([
      { url: 'https://x/a.MP4', type: 'VIDEO' },
      { url: 'https://x/b.mov', type: 'VIDEO' },
      { url: 'https://x/c.webm', type: 'VIDEO' },
      { url: 'https://x/d.png', type: 'IMAGE' },
    ]);
  });

  it('trims each line and drops blank ones', () => {
    const media = buildMediaFromText('  https://x/a.png  \n\n   \n');
    expect(media).toEqual([{ url: 'https://x/a.png', type: 'IMAGE' }]);
  });

  it('returns an empty list for blank input', () => {
    expect(buildMediaFromText('')).toEqual([]);
  });
});

describe('buildIconLayoutInput branches (via CATEGORY-level create/update)', () => {
  const media = buildMediaFromText('');

  it('includes only the native surface when mweb is unset', () => {
    const form: FormState = {
      ...blankForm,
      name: 'Fitness',
      icon_layout_mweb: null,
      icon_layout_native: { position: 'BOTTOM', width: 32, height: 32 },
    };
    const input = buildCreateInput(form, 'CATEGORY', 'parent-1', media);
    expect(input).toMatchObject({
      icon_layout_native: { position: 'BOTTOM', width: 32, height: 32 },
    });
    expect(input).not.toHaveProperty('icon_layout_mweb');
  });

  it('omits both surfaces when neither is configured', () => {
    const form: FormState = { ...blankForm, name: 'Fitness' };
    const input = buildUpdateInput(form, media, 'CATEGORY');
    expect(input).not.toHaveProperty('icon_layout_mweb');
    expect(input).not.toHaveProperty('icon_layout_native');
  });
});

describe('buildCreateInput — SUB level', () => {
  it('carries co-host settings, min_pax and the parent id', () => {
    const form: FormState = {
      ...blankForm,
      name: 'T20',
      allow_co_hosts: true,
      max_co_hosts: 3,
      min_pax: 4,
    };
    const input = buildCreateInput(form, 'SUB', 'cat-1', buildMediaFromText(''));
    expect(input).toMatchObject({
      name: 'T20',
      level: 'SUB',
      parent_id: 'cat-1',
      allow_co_hosts: true,
      max_co_hosts: 3,
      min_pax: 4,
    });
    expect(input).not.toHaveProperty('icon_layout_mweb');
  });
});

describe('buildUpdateInput — SUPER level', () => {
  it('returns only the base fields, with no co-host or icon-layout keys', () => {
    const form: FormState = { ...blankForm, name: 'Human', sort_order: 2 };
    const input = buildUpdateInput(form, buildMediaFromText(''), 'SUPER');
    expect(input).toEqual({
      name: 'Human',
      icon: '',
      description: '',
      media: [],
      sort_order: 2,
      is_active: true,
      gift_card_image_front: '',
      gift_card_image_back: '',
    });
  });
});
