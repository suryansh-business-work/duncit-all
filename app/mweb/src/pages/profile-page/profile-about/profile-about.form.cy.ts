import { describe, expect, it } from 'vitest';
import { profileAboutFormSchema, toProfileAboutInput } from './profile-about.form';

describe('profileAboutFormSchema', () => {
  it('rejects bio longer than 500 chars', async () => {
    const error = await profileAboutFormSchema
      .validate({ bio: 'x'.repeat(501), links: [] }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/bio/i);
  });
  it('rejects link URL that is not http(s)', async () => {
    const error = await profileAboutFormSchema
      .validate({ bio: '', links: [{ label: 'IG', url: 'ftp://x' }] }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/link/i);
  });
  it('rejects more than 10 links', async () => {
    const error = await profileAboutFormSchema
      .validate(
        {
          bio: '',
          links: Array.from({ length: 11 }, () => ({ label: 'X', url: 'https://x.com' })),
        },
        { abortEarly: false },
      )
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/10/);
  });
  it('accepts valid input', async () => {
    await expect(
      profileAboutFormSchema.validate({
        bio: 'hello',
        links: [{ label: 'IG', url: 'https://instagram.com/me' }],
      }),
    ).resolves.toBeTruthy();
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
