/**
 * The one derivation both preview surfaces read. It is pure: the list card and
 * the club page must never disagree about a field, so everything they show is
 * computed here once from the live form values.
 */
import { describe, expect, it } from 'vitest';

import { buildClubPreview } from '../../src/preview/club-preview-model';
import { blankClubFormValues, type ClubFormValues } from '../../src/types';

const labels = { categoryText: 'Sports · Badminton', placeText: 'Indiranagar, Bengaluru' };

const filled = (over: Partial<ClubFormValues> = {}): ClubFormValues => ({
  ...blankClubFormValues,
  club_name: '  Sunset Club ',
  club_description: ' Weekend badminton in Indiranagar. ',
  feature_text: 'https://ik.imagekit.io/duncit/club.png\n\n  https://ik.imagekit.io/duncit/reel.mp4  ',
  moments_text: 'https://ik.imagekit.io/duncit/moment-1.png',
  who_we_are: [' A weekend group ', '   ', 'All levels welcome'],
  what_we_do: ['Doubles every Sunday'],
  perks: [''],
  values: ['Turn up on time'],
  faqs: [
    { question: 'Do I need my own racquet?', answer: 'We have spares.' },
    { question: '   ', answer: 'An answer with no question is dropped.' },
  ],
  community_link: ' https://chat.whatsapp.com/community ',
  group_link: '',
  is_verified: true,
  ...over,
});

describe('buildClubPreview', () => {
  it('trims copy, drops blank bullets and question-less FAQs, and types media by extension', () => {
    expect(buildClubPreview(filled(), labels)).toEqual({
      name: 'Sunset Club',
      description: 'Weekend badminton in Indiranagar.',
      media: [
        { url: 'https://ik.imagekit.io/duncit/club.png', type: 'IMAGE' },
        { url: 'https://ik.imagekit.io/duncit/reel.mp4', type: 'VIDEO' },
      ],
      moments: [{ url: 'https://ik.imagekit.io/duncit/moment-1.png', type: 'IMAGE' }],
      categoryText: 'Sports · Badminton',
      placeText: 'Indiranagar, Bengaluru',
      isVerified: true,
      whoWeAre: ['A weekend group', 'All levels welcome'],
      whatWeDo: ['Doubles every Sunday'],
      perks: [],
      values: ['Turn up on time'],
      faqs: [{ question: 'Do I need my own racquet?', answer: 'We have spares.' }],
      communityLink: 'https://chat.whatsapp.com/community',
      groupLink: '',
    });
  });

  it('gives a club with no name yet a placeholder headline', () => {
    const model = buildClubPreview(filled({ club_name: '   ' }), labels);
    expect(model.name).toBe('Untitled club');
  });

  it('derives an all-empty model from the blank form', () => {
    const model = buildClubPreview(blankClubFormValues, { categoryText: '', placeText: '' });
    expect(model).toMatchObject({
      name: 'Untitled club',
      description: '',
      media: [],
      moments: [],
      isVerified: false,
      whoWeAre: [],
      faqs: [],
      communityLink: '',
      groupLink: '',
    });
  });
});
