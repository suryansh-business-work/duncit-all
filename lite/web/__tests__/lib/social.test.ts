import { describe, expect, it } from 'vitest';
import { SOCIAL_FIELDS, SOCIAL_PREFIX, socialLinks } from '../../lib/social';

describe('SOCIAL_FIELDS and SOCIAL_PREFIX', () => {
  it('lists the networks in display order, the website last', () => {
    expect(SOCIAL_FIELDS).toEqual(['instagram', 'x', 'youtube', 'tiktok', 'linkedin', 'website']);
  });

  it('has an address in front of every handle, and none for the website', () => {
    expect(SOCIAL_PREFIX).toEqual({
      instagram: 'instagram.com/',
      x: 'x.com/',
      youtube: 'youtube.com/@',
      tiktok: 'tiktok.com/@',
      linkedin: 'linkedin.com/in/',
      website: '',
    });
  });
});

describe('socialLinks', () => {
  it('gives nothing for a profile without social links', () => {
    expect(socialLinks(null)).toEqual([]);
    expect(socialLinks(undefined)).toEqual([]);
    expect(socialLinks({})).toEqual([]);
  });

  it('turns each filled handle into its network link, in display order, skipping blanks', () => {
    expect(socialLinks({ website: 'https://asha.example', linkedin: 'asha-rao', instagram: ' asha.rao ', x: '', youtube: '   ' })).toEqual([
      { key: 'instagram', href: 'https://instagram.com/asha.rao' },
      { key: 'linkedin', href: 'https://linkedin.com/in/asha-rao' },
      { key: 'website', href: 'https://asha.example' },
    ]);
  });

  it('encodes a handle so it cannot break out of the network address', () => {
    expect(socialLinks({ tiktok: 'asha/../evil?x=1' })).toEqual([{ key: 'tiktok', href: 'https://tiktok.com/@asha%2F..%2Fevil%3Fx%3D1' }]);
  });

  it('keeps a website only when it is a full http(s) link', () => {
    expect(socialLinks({ website: 'asha.example' })).toEqual([]);
    expect(socialLinks({ website: 'javascript:alert(1)' })).toEqual([]);
    expect(socialLinks({ website: ' http://asha.example/blog ' })).toEqual([{ key: 'website', href: 'http://asha.example/blog' }]);
  });
});
