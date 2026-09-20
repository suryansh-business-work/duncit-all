import { describe, expect, it } from 'vitest';

import { SOCIAL_HANDLE_KEYS, socialHandleLinks } from '../src';

describe('socialHandleLinks', () => {
  it('keeps the filled links, trimmed, in display order', () => {
    expect(
      socialHandleLinks({
        website_url: ' https://duncit.com ',
        instagram_url: 'https://www.instagram.com/duncit_app/',
        x_url: '',
        youtube_url: null,
      }),
    ).toEqual([
      { key: 'instagram_url', url: 'https://www.instagram.com/duncit_app/' },
      { key: 'website_url', url: 'https://duncit.com' },
    ]);
  });

  it('shows nothing when no handles are set', () => {
    expect(socialHandleLinks(null)).toEqual([]);
    expect(socialHandleLinks()).toEqual([]);
  });

  it('orders the five platforms X, Instagram, YouTube, Facebook, Website', () => {
    expect(SOCIAL_HANDLE_KEYS).toEqual(['x_url', 'instagram_url', 'youtube_url', 'facebook_url', 'website_url']);
  });
});
