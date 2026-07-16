import { describe, it, expect } from 'vitest';
import { podContentSchema } from '../src/types';

const validInput = {
  pod_title: 'Valid title',
  pod_description: 'A valid description',
  pod_images_and_videos: [{ url: 'https://example.com/a.jpg', type: 'IMAGE' }],
};

describe('podContentSchema', () => {
  it('accepts a fully valid pod content payload', () => {
    const result = podContentSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects a pod_title shorter than 2 characters', () => {
    const result = podContentSchema.safeParse({ ...validInput, pod_title: 'A' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.pod_title).toContain('Name must be at least 2 characters');
    }
  });

  it('trims pod_title before enforcing the minimum length', () => {
    const result = podContentSchema.safeParse({ ...validInput, pod_title: '  a  ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.pod_title).toContain('Name must be at least 2 characters');
    }
  });

  it('accepts a pod_title that is only long enough once trimmed', () => {
    const result = podContentSchema.safeParse({ ...validInput, pod_title: '  ab  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pod_title).toBe('ab');
    }
  });

  it('rejects an empty pod_description', () => {
    const result = podContentSchema.safeParse({ ...validInput, pod_description: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.pod_description).toContain('Description is required');
    }
  });

  it('rejects a whitespace-only pod_description once trimmed', () => {
    const result = podContentSchema.safeParse({ ...validInput, pod_description: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.pod_description).toContain('Description is required');
    }
  });

  it('accepts an empty pod_images_and_videos array', () => {
    const result = podContentSchema.safeParse({ ...validInput, pod_images_and_videos: [] });
    expect(result.success).toBe(true);
  });

  it('rejects an image entry with an empty url', () => {
    const result = podContentSchema.safeParse({
      ...validInput,
      pod_images_and_videos: [{ url: '', type: 'IMAGE' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a payload missing the pod_images_and_videos array entirely', () => {
    const { pod_images_and_videos: _omit, ...withoutImages } = validInput;
    const result = podContentSchema.safeParse(withoutImages);
    expect(result.success).toBe(false);
  });

  it('allows the image type to be a string, null, or omitted (nullish)', () => {
    const withStringType = podContentSchema.safeParse({
      ...validInput,
      pod_images_and_videos: [{ url: 'https://example.com/a.jpg', type: 'VIDEO' }],
    });
    const withNullType = podContentSchema.safeParse({
      ...validInput,
      pod_images_and_videos: [{ url: 'https://example.com/a.jpg', type: null }],
    });
    const withoutType = podContentSchema.safeParse({
      ...validInput,
      pod_images_and_videos: [{ url: 'https://example.com/a.jpg' }],
    });
    expect(withStringType.success).toBe(true);
    expect(withNullType.success).toBe(true);
    expect(withoutType.success).toBe(true);
  });
});
