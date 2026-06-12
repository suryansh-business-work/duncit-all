import { describe, expect, it } from 'vitest';
import { buildHostUpdateInput, podEditInitialValues, podEditSchema } from './pod-edit.form';
import { blankPodEditValues, type PodEditValues } from './pod-edit.types';

const valid = (over: Partial<PodEditValues> = {}): PodEditValues => ({
  pod_title: 'Sunday community hike',
  pod_description: 'A relaxed group hike around the lake.',
  media_text: 'https://cdn/img.jpg',
  ...over,
});

const issuesOf = (values: PodEditValues) => {
  const result = podEditSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('podEditSchema', () => {
  it('accepts valid values', () => {
    expect(podEditSchema.safeParse(valid()).success).toBe(true);
  });

  it('rejects a short title and a short description', () => {
    const paths = issuesOf(valid({ pod_title: 'x', pod_description: 'short' }));
    expect(paths).toContain('pod_title');
    expect(paths).toContain('pod_description');
  });

  it('requires at least one image URL', () => {
    expect(issuesOf(valid({ media_text: '' }))).toContain('media_text');
    expect(issuesOf(valid({ media_text: 'https://cdn/clip.mp4' }))).toContain('media_text');
    expect(
      podEditSchema.safeParse(valid({ media_text: 'https://cdn/clip.mp4\nhttps://cdn/img.jpg' }))
        .success,
    ).toBe(true);
  });
});

describe('buildHostUpdateInput', () => {
  it('maps trimmed fields and typed media', () => {
    const input = buildHostUpdateInput(
      valid({ pod_title: '  Hike  ', media_text: 'https://cdn/img.jpg\nhttps://cdn/clip.mp4\n' }),
    );
    expect(input.pod_title).toBe('Hike');
    expect(input.pod_images_and_videos).toEqual([
      { url: 'https://cdn/img.jpg', type: 'IMAGE' },
      { url: 'https://cdn/clip.mp4', type: 'VIDEO' },
    ]);
  });
});

describe('podEditInitialValues', () => {
  it('prefills from the pod media list', () => {
    const values = podEditInitialValues({
      id: 'p1',
      pod_title: 'Hike',
      pod_description: 'desc',
      pod_images_and_videos: [
        { url: 'https://cdn/a.jpg', type: 'IMAGE' },
        { url: 'https://cdn/b.mp4', type: 'VIDEO' },
      ],
    });
    expect(values.media_text).toBe('https://cdn/a.jpg\nhttps://cdn/b.mp4');
  });

  it('falls back to blank values without a pod', () => {
    expect(podEditInitialValues(null)).toEqual(blankPodEditValues);
  });
});
