import { describe, expect, it } from 'vitest';

import {
  blankPodEditValues,
  buildHostUpdateInput,
  buildPodEditModerationInput,
  podEditInitialValues,
  podEditSchema,
} from '../src/pod-edit.form';
import type { HostPodTarget } from '../src/types';

const IMG = 'https://cdn.duncit.com/pod/cover.jpg';
const VID = 'https://cdn.duncit.com/pod/clip.mp4';

const values = (over: Partial<typeof blankPodEditValues> = {}) => ({
  pod_title: 'Sunday Badminton',
  pod_description: 'Doubles at Court 2, all levels welcome.',
  media_text: IMG,
  ...over,
});

const errorsFor = (input: unknown) => {
  const result = podEditSchema.safeParse(input);
  if (result.success) return {} as Record<string, string>;
  return Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('podEditSchema', () => {
  it('accepts a complete edit', () => {
    expect(podEditSchema.safeParse(values()).success).toBe(true);
  });

  it('needs a title of at least three characters', () => {
    expect(errorsFor(values({ pod_title: 'ab' })).pod_title).toBe('Title is too short');
    expect(errorsFor(values({ pod_title: '   ' })).pod_title).toBe('Title is too short');
  });

  it('caps the title at 120 characters', () => {
    expect(errorsFor(values({ pod_title: 'a'.repeat(121) })).pod_title).toBe('Title is too long');
    expect(podEditSchema.safeParse(values({ pod_title: 'a'.repeat(120) })).success).toBe(true);
  });

  it('needs a description worth reading', () => {
    expect(errorsFor(values({ pod_description: 'too short' })).pod_description).toBe('Add a longer description');
  });

  it('needs at least one IMAGE — a gallery of videos alone has no cover', () => {
    expect(errorsFor(values({ media_text: VID })).media_text).toBe('Add at least one image URL');
    expect(errorsFor(values({ media_text: '' })).media_text).toBe('Add at least one image URL');
    expect(podEditSchema.safeParse(values({ media_text: `${VID}\n${IMG}` })).success).toBe(true);
  });
});

describe('buildHostUpdateInput', () => {
  it('trims the text and splits the gallery into typed media', () => {
    expect(buildHostUpdateInput(values({ pod_title: '  Sunday Badminton  ', media_text: `${IMG}\n${VID}` }))).toEqual({
      pod_title: 'Sunday Badminton',
      pod_description: 'Doubles at Court 2, all levels welcome.',
      pod_images_and_videos: [
        { url: IMG, type: 'IMAGE' },
        { url: VID, type: 'VIDEO' },
      ],
    });
  });
});

describe('buildPodEditModerationInput', () => {
  it('sends the title, the description and only the IMAGES to the content check', () => {
    const input = buildPodEditModerationInput(values({ media_text: `${IMG}\n${VID}` }));

    expect(input.pod_title).toBe('Sunday Badminton');
    expect(input.pod_description).toBe('Doubles at Court 2, all levels welcome.');
    expect(input.image_urls).toEqual([IMG]);
  });

  it('sends no images when the gallery holds none', () => {
    expect(buildPodEditModerationInput(values({ media_text: VID })).image_urls).toEqual([]);
  });
});

describe('podEditInitialValues', () => {
  it('prefills from the pod being edited', () => {
    const pod = {
      pod_title: 'Sunday Badminton',
      pod_description: 'Doubles at Court 2.',
      pod_images_and_videos: [{ url: IMG, type: 'IMAGE' }],
    } as HostPodTarget;

    expect(podEditInitialValues(pod)).toEqual({
      pod_title: 'Sunday Badminton',
      pod_description: 'Doubles at Court 2.',
      media_text: IMG,
    });
  });

  it('opens blank when there is no pod yet', () => {
    expect(podEditInitialValues(null)).toEqual(blankPodEditValues);
  });

  it('reads missing fields as empty rather than as the string "undefined"', () => {
    expect(podEditInitialValues({} as HostPodTarget)).toEqual(blankPodEditValues);
  });
});
