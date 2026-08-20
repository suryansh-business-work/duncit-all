import { describe, expect, it } from 'vitest';
import {
  autoPodSchema,
  emptyAutoPodForm,
  parseHashtags,
  parseMediaLines,
  toAutoPodInput,
  type AutoPodFormValues,
} from '@duncit/auto-pods';

const base: AutoPodFormValues = {
  ...emptyAutoPodForm,
  pod_title: 'Sunset rooftop board games',
  category: {
    super_id: 'super-1',
    super_name: 'Play',
    category_id: 'cat-1',
    category_name: 'Indoor games',
    sub_id: 'sub-1',
    sub_name: 'Board games',
  },
  pod_description: 'Three hours of modern board games with a host who teaches every rule.',
  media: 'https://cdn.duncit.com/auto/board-games.jpg',
  pod_amount: 499,
  no_of_spots: 8,
  pod_hashtag: '#boardgames, sunset',
};

const messagesOf = (input: unknown) => {
  const result = autoPodSchema.safeParse(input);
  return result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');
};

describe('autoPodSchema', () => {
  it('rejects a title under three characters', () => {
    expect(messagesOf({ ...base, pod_title: 'Hi' })).toMatch(/title/i);
  });

  it('requires a sub category', () => {
    expect(messagesOf({ ...base, category: emptyAutoPodForm.category })).toMatch(/sub category/i);
  });

  it('requires a description', () => {
    expect(messagesOf({ ...base, pod_description: '   ' })).toMatch(/description/i);
  });

  it('requires at least one image URL', () => {
    expect(messagesOf({ ...base, media: '\n  \n' })).toMatch(/image/i);
  });

  it('keeps the ticket price between 1 and 1999', () => {
    expect(messagesOf({ ...base, pod_amount: 0 })).toMatch(/1999/);
    expect(messagesOf({ ...base, pod_amount: 2000 })).toMatch(/1999/);
  });

  it('needs at least two spots, because the host sits in one for free', () => {
    expect(messagesOf({ ...base, no_of_spots: 1 })).toMatch(/2 spots/i);
  });

  it('accepts a complete template', () => {
    expect(autoPodSchema.safeParse(base).success).toBe(true);
  });
});

describe('toAutoPodInput', () => {
  it('sends only the sub-category id, and images as PodMediaInput rows', () => {
    const input = toAutoPodInput({
      ...base,
      media: 'https://cdn.duncit.com/a.jpg\n\nhttps://cdn.duncit.com/b.jpg',
    });
    expect(input.sub_category_id).toBe('sub-1');
    expect(input.pod_images_and_videos).toEqual([
      { url: 'https://cdn.duncit.com/a.jpg', type: 'IMAGE' },
      { url: 'https://cdn.duncit.com/b.jpg', type: 'IMAGE' },
    ]);
  });

  it('strips the hash from hashtags and nulls empty payment terms', () => {
    const input = toAutoPodInput(base);
    expect(input.pod_hashtag).toEqual(['boardgames', 'sunset']);
    expect(input.payment_terms).toBeNull();
  });
});

describe('text field parsers', () => {
  it('drops blank media lines', () => {
    expect(parseMediaLines(' \n https://x.test/a.png \n\n')).toHaveLength(1);
  });

  it('splits hashtags on commas and whitespace', () => {
    expect(parseHashtags('#one  two,three')).toEqual(['one', 'two', 'three']);
  });
});
