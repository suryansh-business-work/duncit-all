import { describe, expect, it } from 'vitest';
import { profileAboutFormSchema, toProfileAboutInput } from './profile-about.form';

const errorText = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message).join(' ');

describe('profileAboutFormSchema', () => {
  it('rejects bio longer than 500 chars', () => {
    const result = profileAboutFormSchema.safeParse({ bio: 'x'.repeat(501), links: [] });
    expect(errorText(result)).toMatch(/bio/i);
  });
  it('rejects link URL that is not http(s)', () => {
    const result = profileAboutFormSchema.safeParse({ bio: '', links: [{ label: 'IG', url: 'ftp://x' }] });
    expect(errorText(result)).toMatch(/link/i);
  });
  it('rejects more than 10 links', () => {
    const result = profileAboutFormSchema.safeParse({
      bio: '',
      links: Array.from({ length: 11 }, () => ({ label: 'X', url: 'https://x.com' })),
    });
    expect(errorText(result)).toMatch(/10/);
  });
  it('accepts valid input', () => {
    const result = profileAboutFormSchema.safeParse({
      bio: 'hello',
      links: [{ label: 'IG', url: 'https://instagram.com/me' }],
    });
    expect(result.success).toBe(true);
  });
});

describe('toProfileAboutInput', () => {
  it('drops empty link rows', () => {
    const input = toProfileAboutInput({
      bio: 'hi',
      links: [{ label: '', url: '' }, { label: 'IG', url: 'https://x.com' }],
    });
    expect(input.profile_links).toHaveLength(1);
  });
});
