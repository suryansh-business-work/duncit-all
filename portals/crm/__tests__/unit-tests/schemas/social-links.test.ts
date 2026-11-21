import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  SOCIAL_LINK_MAX,
  SOCIAL_NAME_MAX,
  cleanSocialLinks,
  isWebUrl,
  socialLinksSchema,
  socialLinksToForm,
  withSocialLinks,
} from '@/forms/validation/socialLinks';
import { englishT } from '../helpers/englishT';

const issues = (value: unknown) => {
  const result = socialLinksSchema(englishT()).safeParse(value);
  return result.success ? [] : result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
};

const rows = (count: number) => Array.from({ length: count }, (_, i) => ({ name: `Link ${i}`, url: `https://example.com/${i}` }));

describe('isWebUrl', () => {
  it('accepts http and https addresses', () => {
    expect(isWebUrl('https://youtube.com/@duncit')).toBe(true);
    expect(isWebUrl('http://example.com')).toBe(true);
  });

  it('refuses script, data and other schemes, bare hosts and blanks', () => {
    expect(isWebUrl('javascript:alert(1)')).toBe(false);
    expect(isWebUrl('data:text/html,<b>hi</b>')).toBe(false);
    expect(isWebUrl('mailto:owner@example.com')).toBe(false);
    expect(isWebUrl('ftp://files.example.com')).toBe(false);
    expect(isWebUrl('youtube.com/@duncit')).toBe(false);
    expect(isWebUrl('')).toBe(false);
  });
});

describe('socialLinksSchema', () => {
  it('accepts an empty list, full rows and a row left completely blank', () => {
    expect(issues([])).toEqual([]);
    expect(issues([{ name: 'YouTube', url: 'https://youtube.com/@duncit' }, { name: '', url: '' }])).toEqual([]);
  });

  it('accepts a link without a name', () => {
    expect(issues([{ name: '', url: 'https://linktr.ee/duncit' }])).toEqual([]);
  });

  it('needs the link once a name is typed, even when the link is only spaces', () => {
    expect(issues([{ name: 'Facebook', url: '   ' }])).toEqual([
      { path: '0.url', message: 'Add the link for this name' },
    ]);
  });

  it('refuses a javascript: link and a link without a scheme', () => {
    expect(issues([{ name: 'X', url: 'javascript:alert(document.cookie)' }])).toEqual([
      { path: '0.url', message: 'Enter a full link starting with https://' },
    ]);
    expect(issues([{ name: 'X', url: 'x.com/duncit' }])).toEqual([
      { path: '0.url', message: 'Enter a full link starting with https://' },
    ]);
  });

  it(`allows ${SOCIAL_LINK_MAX} links and refuses one more`, () => {
    expect(issues(rows(SOCIAL_LINK_MAX))).toEqual([]);
    expect(issues(rows(SOCIAL_LINK_MAX + 1))).toEqual([{ path: '', message: `Up to ${SOCIAL_LINK_MAX} social links` }]);
  });

  it(`allows a ${SOCIAL_NAME_MAX}-character name and refuses a longer one`, () => {
    expect(issues([{ name: 'n'.repeat(SOCIAL_NAME_MAX), url: 'https://example.com' }])).toEqual([]);
    expect(issues([{ name: 'n'.repeat(SOCIAL_NAME_MAX + 1), url: 'https://example.com' }])).toEqual([
      { path: '0.name', message: `Keep the name under ${SOCIAL_NAME_MAX} characters` },
    ]);
  });

  it('refuses a link longer than 2048 characters', () => {
    const long = `https://example.com/${'a'.repeat(2048)}`;
    expect(issues([{ name: '', url: long }])).toEqual([{ path: '0.url', message: 'This link is too long' }]);
  });

  it('measures the name after trimming it', () => {
    expect(issues([{ name: `  ${'n'.repeat(SOCIAL_NAME_MAX)}  `, url: 'https://example.com' }])).toEqual([]);
  });
});

describe('withSocialLinks', () => {
  const base = z.object({ title: z.string().min(1, 'Title is required') });

  it('adds social links to a schema and keeps its own rules', () => {
    const schema = withSocialLinks(base, englishT());
    expect(schema.safeParse({ title: 'Hall', social_links: [] }).success).toBe(true);

    const result = schema.safeParse({ title: '', social_links: [{ name: 'Facebook', url: '' }] });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message).sort()).toEqual(['Add the link for this name', 'Title is required']);
  });

  it('requires the social links list', () => {
    expect(withSocialLinks(base, englishT()).safeParse({ title: 'Hall' }).success).toBe(false);
  });

  it('adds a length-capped Instagram field only when asked', () => {
    const long = `https://instagram.com/${'a'.repeat(2048)}`;
    const withInstagram = withSocialLinks(base, englishT(), true);
    expect(withInstagram.safeParse({ title: 'Hall', social_links: [], instagram_link: '' }).success).toBe(true);
    expect(withInstagram.safeParse({ title: 'Hall', social_links: [] }).success).toBe(false);
    expect(withInstagram.safeParse({ title: 'Hall', social_links: [], instagram_link: long }).error?.issues[0].message).toBe(
      'This link is too long',
    );

    // Without the flag an Instagram value is not checked at all.
    expect(withSocialLinks(base, englishT()).safeParse({ title: 'Hall', social_links: [], instagram_link: long }).success).toBe(true);
  });
});

describe('cleanSocialLinks', () => {
  it('trims every row and drops rows without a link', () => {
    expect(
      cleanSocialLinks([
        { name: ' YouTube ', url: ' https://youtube.com/@duncit ' },
        { name: 'Unfinished', url: '  ' },
        { name: '', url: '' },
        { name: '', url: 'https://linktr.ee/duncit' },
      ]),
    ).toEqual([
      { name: 'YouTube', url: 'https://youtube.com/@duncit' },
      { name: '', url: 'https://linktr.ee/duncit' },
    ]);
  });

  it('gives an empty list for no rows', () => {
    expect(cleanSocialLinks(undefined)).toEqual([]);
    expect(cleanSocialLinks([])).toEqual([]);
  });
});

describe('socialLinksToForm', () => {
  it('copies saved links into form rows', () => {
    expect(socialLinksToForm([{ name: 'YouTube', url: 'https://youtube.com/@duncit' }])).toEqual([
      { name: 'YouTube', url: 'https://youtube.com/@duncit' },
    ]);
  });

  it('turns missing links and missing parts into empty values', () => {
    expect(socialLinksToForm(null)).toEqual([]);
    expect(socialLinksToForm(undefined)).toEqual([]);
    const partial = [{ name: null, url: 'https://x.com/duncit' }] as unknown as Parameters<typeof socialLinksToForm>[0];
    expect(socialLinksToForm(partial)).toEqual([{ name: '', url: 'https://x.com/duncit' }]);
  });
});
