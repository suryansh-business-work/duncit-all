import { describe, expect, it } from 'vitest';

import {
  ALLOWED_DOC_EXT,
  isAllowedExt,
  maxSizeBytes,
  uploadFormSchema,
  validateUpload,
} from '../upload/upload.form';
import { profileAboutFormSchema, profileLinkSchema, toProfileAboutInput } from '../profile-about/profile-about.form';
import { petProfileFormSchema, toPetProfileInput } from '../pet-profile/pet-profile.form';
import { postFormSchema, toPostInput } from '../post/post.form';

const firstMessage = (r: { success: boolean; error?: { issues: Array<{ message: string }> } }) =>
  r.success ? '' : (r.error?.issues[0]?.message ?? '');

describe('upload form', () => {
  it('asks for a kind, rejects an unknown one, and a name and size', () => {
    expect(firstMessage(uploadFormSchema.safeParse({ file_name: 'a.png', size_bytes: 5 }))).toBe('Kind is required');
    expect(firstMessage(uploadFormSchema.safeParse({ kind: 'AUDIO', file_name: 'a.png', size_bytes: 5 }))).toBe('Select a valid upload kind');
    expect(firstMessage(uploadFormSchema.safeParse({ kind: 'IMAGE', size_bytes: 5 }))).toBe('File name is required');
    expect(firstMessage(uploadFormSchema.safeParse({ kind: 'IMAGE', file_name: '  ', size_bytes: 5 }))).toBe('File name is required');
    expect(firstMessage(uploadFormSchema.safeParse({ kind: 'IMAGE', file_name: 'x'.repeat(256), size_bytes: 5 }))).toBe('File name too long');
    expect(firstMessage(uploadFormSchema.safeParse({ kind: 'IMAGE', file_name: 'a.png' }))).toBe('Size is required');
    expect(firstMessage(uploadFormSchema.safeParse({ kind: 'IMAGE', file_name: 'a.png', size_bytes: 1.5 }))).toBe('Size must be an integer');
    expect(firstMessage(uploadFormSchema.safeParse({ kind: 'IMAGE', file_name: 'a.png', size_bytes: 0 }))).toBe('Size must be greater than 0');
    expect(uploadFormSchema.safeParse({ kind: 'VIDEO', file_name: ' a.mp4 ', size_bytes: 9 }).success).toBe(true);
  });

  it('accepts only the extensions of the chosen kind, case-insensitively', () => {
    expect(isAllowedExt('PIC.JPG', 'IMAGE')).toBe(true);
    expect(isAllowedExt('clip.mp4', 'IMAGE')).toBe(false);
    expect(isAllowedExt('clip.MOV', 'VIDEO')).toBe(true);
    expect(isAllowedExt('pic.png', 'VIDEO')).toBe(false);
    expect(ALLOWED_DOC_EXT.every((ext) => isAllowedExt(`file${ext}`, 'DOCUMENT'))).toBe(true);
    expect(isAllowedExt('pic.png', 'DOCUMENT')).toBe(false);
  });

  it('allows 10 MB for images, 100 MB for video and 25 MB for documents', () => {
    expect(maxSizeBytes('IMAGE')).toBe(10 * 1024 * 1024);
    expect(maxSizeBytes('VIDEO')).toBe(100 * 1024 * 1024);
    expect(maxSizeBytes('DOCUMENT')).toBe(25 * 1024 * 1024);
  });

  it('reports a wrong type and an oversize file together, and nothing for a good file', () => {
    expect(validateUpload({ kind: 'IMAGE', file_name: 'a.txt', size_bytes: 11 * 1024 * 1024 })).toEqual({
      file_name: 'File type not allowed for IMAGE',
      size_bytes: 'File too large; max is 10MB',
    });
    expect(validateUpload({ kind: 'DOCUMENT', file_name: 'a.pdf', size_bytes: 25 * 1024 * 1024 })).toEqual({});
    expect(validateUpload({ kind: 'DOCUMENT', file_name: 'a.pdf', size_bytes: 25 * 1024 * 1024 + 1 })).toEqual({
      size_bytes: 'File too large; max is 25MB',
    });
  });
});

describe('profile about form', () => {
  it('accepts an empty link, http and https links, and rejects other schemes and words', () => {
    expect(profileLinkSchema.safeParse({}).success).toBe(true);
    expect(profileLinkSchema.safeParse({ label: 'a', url: 'https://a.example' }).success).toBe(true);
    expect(profileLinkSchema.safeParse({ label: 'a', url: 'http://a.example' }).success).toBe(true);
    expect(firstMessage(profileLinkSchema.safeParse({ label: 'a', url: 'ftp://a.example' }))).toBe('Link must be a valid http(s) URL');
    expect(firstMessage(profileLinkSchema.safeParse({ label: 'a', url: 'nonsense' }))).toBe('Link must be a valid http(s) URL');
    expect(firstMessage(profileLinkSchema.safeParse({ label: 'x'.repeat(41), url: '' }))).toBe('Label must be 40 characters or fewer');
  });

  it('caps the bio at 500 and links at 10, and defaults both to empty', () => {
    expect(profileAboutFormSchema.parse({})).toEqual({ bio: '', links: [] });
    expect(firstMessage(profileAboutFormSchema.safeParse({ bio: 'x'.repeat(501) }))).toBe('Bio must be 500 characters or fewer');
    const eleven = Array.from({ length: 11 }, () => ({ label: 'a', url: 'https://a.example' }));
    expect(firstMessage(profileAboutFormSchema.safeParse({ links: eleven }))).toBe('You can add up to 10 links');
  });

  it('turns an empty bio into null and drops blank link rows', () => {
    expect(
      toProfileAboutInput({
        bio: '   ',
        links: [
          { label: ' Site ', url: ' https://a.example ' },
          { label: '', url: '' },
          { label: 'Label only', url: '' },
          { label: '', url: 'https://b.example' },
        ],
      })
    ).toEqual({
      bio: null,
      profile_links: [
        { label: 'Site', url: 'https://a.example' },
        { label: 'Label only', url: '' },
        { label: '', url: 'https://b.example' },
      ],
    });
    expect(toProfileAboutInput({ bio: ' hi ', links: [] })).toEqual({ bio: 'hi', profile_links: [] });
  });
});

describe('pet profile form', () => {
  const valid = { name: ' Rex ', species: 'DOG' as const };

  it('needs a name and a known species, and bounds age', () => {
    expect(firstMessage(petProfileFormSchema.safeParse({ species: 'DOG' }))).toBe('Name is required');
    expect(firstMessage(petProfileFormSchema.safeParse({ name: ' ', species: 'DOG' }))).toBe('Name is required');
    expect(firstMessage(petProfileFormSchema.safeParse({ name: 'x'.repeat(61), species: 'DOG' }))).toBe('Name must be 60 characters or fewer');
    expect(firstMessage(petProfileFormSchema.safeParse({ name: 'Rex' }))).toBe('Species is required');
    expect(firstMessage(petProfileFormSchema.safeParse({ name: 'Rex', species: 'FISH' }))).toBe('Select a valid species');
    expect(firstMessage(petProfileFormSchema.safeParse({ ...valid, age_years: 'old' }))).toBe('Age must be a number');
    expect(firstMessage(petProfileFormSchema.safeParse({ ...valid, age_years: -1 }))).toBe('Age cannot be negative');
    expect(firstMessage(petProfileFormSchema.safeParse({ ...valid, age_years: 41 }))).toBe('Age cannot exceed 40');
  });

  it('defaults the optional fields and trims the name', () => {
    expect(petProfileFormSchema.parse(valid)).toEqual({ name: 'Rex', species: 'DOG', breed: '', age_years: 0, bio: '', photo_url: '' });
  });

  it('sends blank optional text as null', () => {
    expect(toPetProfileInput({ name: ' Rex ', species: 'CAT', breed: ' ', age_years: 0, bio: '', photo_url: ' ' })).toEqual({
      name: 'Rex',
      species: 'CAT',
      breed: null,
      age_years: 0,
      bio: null,
      photo_url: null,
    });
    expect(toPetProfileInput({ name: 'Rex', species: 'BIRD', breed: ' Lab ', age_years: 3, bio: ' good ', photo_url: ' http://p ' })).toEqual({
      name: 'Rex',
      species: 'BIRD',
      breed: 'Lab',
      age_years: 3,
      bio: 'good',
      photo_url: 'http://p',
    });
  });
});

describe('post form', () => {
  it('needs a visibility, bounds text and media, and needs text or media', () => {
    expect(firstMessage(postFormSchema.safeParse({ text: 'hi' }))).toBe('Visibility is required');
    expect(firstMessage(postFormSchema.safeParse({ text: 'hi', visibility: 'FRIENDS' }))).toBe('Select a valid visibility');
    expect(firstMessage(postFormSchema.safeParse({ text: 'x'.repeat(2001), visibility: 'PUBLIC' }))).toBe('Post must be 2000 characters or fewer');
    expect(firstMessage(postFormSchema.safeParse({ media: ['nope'], visibility: 'PUBLIC' }))).toBe('Invalid media URL');
    const eleven = Array.from({ length: 11 }, (_, i) => `https://m.example/${i}.png`);
    expect(firstMessage(postFormSchema.safeParse({ media: eleven, visibility: 'PUBLIC' }))).toBe('Up to 10 media items');
    expect(firstMessage(postFormSchema.safeParse({ text: '   ', visibility: 'PUBLIC' }))).toBe('Post must have text or media');
    expect(postFormSchema.safeParse({ text: 'hi', visibility: 'PRIVATE' }).success).toBe(true);
    expect(postFormSchema.safeParse({ media: ['https://m.example/a.png'], visibility: 'PUBLIC' }).success).toBe(true);
  });

  it('sends blank text as null and trims media addresses', () => {
    expect(toPostInput({ text: '  ', media: [' https://m.example/a.png '], visibility: 'PUBLIC' })).toEqual({
      text: null,
      media: ['https://m.example/a.png'],
      visibility: 'PUBLIC',
    });
    expect(toPostInput({ text: ' hi ', media: [], visibility: 'PRIVATE' })).toEqual({ text: 'hi', media: [], visibility: 'PRIVATE' });
  });
});
