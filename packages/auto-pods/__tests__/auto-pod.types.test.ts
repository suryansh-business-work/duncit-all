import { describe, expect, it } from 'vitest';

import {
  EMPTY_AUTO_POD_CATEGORY,
  emptyAutoPodForm,
  parseHashtags,
  parseMediaLines,
  toAutoPodForm,
  type AutoPodTemplateRow,
} from '../src/form/auto-pod.types';

const IMG_A = 'https://cdn.duncit.com/auto/a.jpg';
const IMG_B = 'https://cdn.duncit.com/auto/b.jpg';

const row = (over: Partial<AutoPodTemplateRow> = {}): AutoPodTemplateRow => ({
  pod_title: 'Weekly Badminton',
  pod_description: 'Doubles, all levels.',
  pod_images_and_videos: [{ url: IMG_A, type: 'IMAGE' }],
  pod_amount: 250,
  no_of_spots: 8,
  ...over,
});

describe('parseMediaLines', () => {
  it('reads one image URL per line and tags them all IMAGE — a template carries no video', () => {
    expect(parseMediaLines(`${IMG_A}\n${IMG_B}`)).toEqual([
      { url: IMG_A, type: 'IMAGE' },
      { url: IMG_B, type: 'IMAGE' },
    ]);
  });

  it('drops blank lines and trims the stray whitespace an author leaves', () => {
    expect(parseMediaLines(`\n  ${IMG_A}  \n\n   \n`)).toEqual([{ url: IMG_A, type: 'IMAGE' }]);
  });

  it('reads an empty field as no media', () => {
    expect(parseMediaLines('')).toEqual([]);
    expect(parseMediaLines('   \n  ')).toEqual([]);
  });
});

describe('parseHashtags', () => {
  it('splits on either commas or spaces, because authors use both', () => {
    expect(parseHashtags('badminton, indoor sports')).toEqual(['badminton', 'indoor', 'sports']);
  });

  it('strips the hash an author types, however many they type', () => {
    expect(parseHashtags('#badminton ##indoor')).toEqual(['badminton', 'indoor']);
  });

  it('drops the empties a trailing comma or double space leaves', () => {
    expect(parseHashtags('badminton,, indoor,  ')).toEqual(['badminton', 'indoor']);
  });

  it('drops a bare hash that carries no tag', () => {
    expect(parseHashtags('# ## badminton')).toEqual(['badminton']);
  });

  it('reads an empty field as no hashtags', () => {
    expect(parseHashtags('')).toEqual([]);
    expect(parseHashtags('   ')).toEqual([]);
  });
});

describe('emptyAutoPodForm', () => {
  it('opens on a one-time template with a blank category and the minimum viable pod', () => {
    expect(emptyAutoPodForm).toEqual({
      pod_title: '',
      category: EMPTY_AUTO_POD_CATEGORY,
      pod_description: '',
      pod_info: '',
      media: '',
      pod_amount: 1,
      no_of_spots: 2,
      pod_occurrence: 'ONE_TIME',
      pod_hashtag: '',
      payment_terms: '',
    });
  });

  it('starts with every category field blank', () => {
    expect(Object.values(EMPTY_AUTO_POD_CATEGORY).every((value) => value === '')).toBe(true);
  });
});

describe('toAutoPodForm', () => {
  const category = {
    super_id: 's1',
    super_name: 'Sports',
    category_id: 'c1',
    category_name: 'Racquet',
    sub_id: 'b1',
    sub_name: 'Badminton',
  };

  it('rehydrates the text fields and takes the category from the caller’s picker', () => {
    expect(toAutoPodForm(row(), category)).toMatchObject({
      pod_title: 'Weekly Badminton',
      pod_description: 'Doubles, all levels.',
      pod_amount: 250,
      no_of_spots: 8,
      category,
    });
  });

  it('turns the stored media back into one URL per line', () => {
    const values = toAutoPodForm(
      row({ pod_images_and_videos: [{ url: IMG_A, type: 'IMAGE' }, { url: IMG_B, type: 'IMAGE' }] }),
      category
    );

    expect(values.media).toBe(`${IMG_A}\n${IMG_B}`);
    expect(parseMediaLines(values.media)).toEqual([
      { url: IMG_A, type: 'IMAGE' },
      { url: IMG_B, type: 'IMAGE' },
    ]);
  });

  it('joins the stored hashtags with spaces, which parseHashtags reads back', () => {
    const values = toAutoPodForm(row({ pod_hashtag: ['badminton', 'indoor'] }), category);

    expect(values.pod_hashtag).toBe('badminton indoor');
    expect(parseHashtags(values.pod_hashtag)).toEqual(['badminton', 'indoor']);
  });

  it('reads the nullable fields as empty rather than as the string "null"', () => {
    expect(toAutoPodForm(row({ pod_info: null, pod_hashtag: null, payment_terms: null }), category)).toMatchObject({
      pod_info: '',
      pod_hashtag: '',
      payment_terms: '',
    });
  });

  it('falls back to a one-time template when the row names no occurrence', () => {
    expect(toAutoPodForm(row({ pod_occurrence: null }), category).pod_occurrence).toBe('ONE_TIME');
    expect(toAutoPodForm(row({ pod_occurrence: '' }), category).pod_occurrence).toBe('ONE_TIME');
    expect(toAutoPodForm(row({ pod_occurrence: 'WEEKLY' }), category).pod_occurrence).toBe('WEEKLY');
  });
});
