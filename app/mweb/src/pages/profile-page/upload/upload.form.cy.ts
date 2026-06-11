import { describe, expect, it } from 'vitest';
import { isAllowedExt, maxSizeBytes, uploadFormSchema, validateUpload } from './upload.form';

describe('uploadFormSchema', () => {
  it('rejects empty file name', async () => {
    const error = await uploadFormSchema
      .validate({ kind: 'IMAGE', file_name: '', size_bytes: 100 }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/file name/i);
  });
  it('rejects invalid kind', async () => {
    const error = await uploadFormSchema
      .validate({ kind: 'AUDIO' as any, file_name: 'x.mp3', size_bytes: 100 }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/kind/i);
  });
});

describe('isAllowedExt', () => {
  it('allows png for IMAGE', () => {
    expect(isAllowedExt('photo.png', 'IMAGE')).toBe(true);
  });
  it('rejects exe for IMAGE', () => {
    expect(isAllowedExt('photo.exe', 'IMAGE')).toBe(false);
  });
  it('allows mp4 for VIDEO', () => {
    expect(isAllowedExt('clip.mp4', 'VIDEO')).toBe(true);
  });
});

describe('validateUpload', () => {
  it('flags too-large image', () => {
    const errors = validateUpload({ kind: 'IMAGE', file_name: 'pic.png', size_bytes: maxSizeBytes('IMAGE') + 1 });
    expect(errors.size_bytes).toMatch(/too large/i);
  });
  it('passes a 1MB png', () => {
    const errors = validateUpload({ kind: 'IMAGE', file_name: 'pic.png', size_bytes: 1024 * 1024 });
    expect(Object.keys(errors)).toHaveLength(0);
  });
});
