import { describe, expect, it } from 'vitest';

import {
  blankPodResubmitValues,
  buildHostResubmitInput,
  buildPodResubmitModerationInput,
  podResubmitInitialValues,
  podResubmitSchema,
} from '../src/pod-resubmit/pod-resubmit.form';
import type { HostPodTarget } from '../src/types';

const IMG = 'https://cdn.duncit.com/pod/cover.jpg';
const VID = 'https://cdn.duncit.com/pod/clip.mp4';

const values = (over: Partial<typeof blankPodResubmitValues> = {}) => ({
  pod_title: 'Sunday Badminton',
  pod_description: 'Doubles at Court 2, all levels welcome.',
  media_text: IMG,
  venue_id: 'venue-1',
  venue_slot_id: 'slot-1',
  ...over,
});

const errorsFor = (input: unknown) => {
  const result = podResubmitSchema.safeParse(input);
  if (result.success) return {} as Record<string, string>;
  return Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('podResubmitSchema', () => {
  it('accepts a resubmission with a fresh venue and slot', () => {
    expect(podResubmitSchema.safeParse(values()).success).toBe(true);
  });

  it('will not resubmit without a venue and a slot — that is the whole point of a rejection', () => {
    expect(errorsFor(values({ venue_id: '' })).venue_id).toBe('Select a venue');
    expect(errorsFor(values({ venue_slot_id: '' })).venue_slot_id).toBe('Select a time slot');
  });

  it('keeps the same content rules as an ordinary edit', () => {
    expect(errorsFor(values({ pod_title: 'ab' })).pod_title).toBe('Title is too short');
    expect(errorsFor(values({ pod_title: 'a'.repeat(121) })).pod_title).toBe('Title is too long');
    expect(errorsFor(values({ pod_description: 'short' })).pod_description).toBe('Add a longer description');
    expect(errorsFor(values({ media_text: VID })).media_text).toBe('Add at least one image URL');
  });
});

describe('buildHostResubmitInput', () => {
  it('sends the trimmed copy, the typed gallery and the new booking', () => {
    expect(buildHostResubmitInput(values({ pod_title: '  Sunday Badminton  ', media_text: `${IMG}\n${VID}` }))).toEqual({
      pod_title: 'Sunday Badminton',
      pod_description: 'Doubles at Court 2, all levels welcome.',
      pod_images_and_videos: [
        { url: IMG, type: 'IMAGE' },
        { url: VID, type: 'VIDEO' },
      ],
      venue_id: 'venue-1',
      venue_slot_id: 'slot-1',
    });
  });
});

describe('buildPodResubmitModerationInput', () => {
  it('checks the copy and the images — a venue and a slot are bookings, not content', () => {
    const input = buildPodResubmitModerationInput(values({ media_text: `${IMG}\n${VID}` }));

    expect(input).toEqual({
      pod_title: 'Sunday Badminton',
      pod_description: 'Doubles at Court 2, all levels welcome.',
      image_urls: [IMG],
    });
  });
});

describe('podResubmitInitialValues', () => {
  it('keeps the rejected pod’s copy but clears the venue and slot, so a new one must be picked', () => {
    const pod = {
      pod_title: 'Sunday Badminton',
      pod_description: 'Doubles at Court 2.',
      pod_images_and_videos: [{ url: IMG, type: 'IMAGE' }],
    } as HostPodTarget;

    expect(podResubmitInitialValues(pod)).toEqual({
      pod_title: 'Sunday Badminton',
      pod_description: 'Doubles at Court 2.',
      media_text: IMG,
      venue_id: '',
      venue_slot_id: '',
    });
  });

  it('opens blank when there is no pod yet', () => {
    expect(podResubmitInitialValues(null)).toEqual(blankPodResubmitValues);
    expect(podResubmitInitialValues({} as HostPodTarget)).toEqual(blankPodResubmitValues);
  });
});
