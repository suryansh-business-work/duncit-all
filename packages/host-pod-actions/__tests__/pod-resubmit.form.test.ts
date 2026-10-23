import { describe, expect, it } from 'vitest';

import {
  blankPodResubmitValues,
  buildHostResubmitInput,
  buildPodResubmitModerationInput,
  buildPodResubmitSchema,
  podResubmitInitialValues,
  resubmitOfferOf,
} from '../src/pod-resubmit/pod-resubmit.form';
import { mwebHostPodLabels } from '../src/labels';
import type { HostPodTarget } from '../src/types';

const IMG = 'https://cdn.duncit.com/pod/cover.jpg';
const VID = 'https://cdn.duncit.com/pod/clip.mp4';
const START = '2030-06-01T10:00:00.000Z';
const END = '2030-06-01T12:00:00.000Z';

/**
 * A validation message is copy the host reads, so the schema is built from the
 * surface's labels (rule 38). Resolving them as `t:<key>` keeps the assertions
 * about WHICH message was raised rather than about the English wording.
 */
const labels = mwebHostPodLabels((key) => `t:${key}`);
const podResubmitSchema = buildPodResubmitSchema(labels);

const values = (over: Partial<typeof blankPodResubmitValues> = {}) => ({
  pod_title: 'Sunday Badminton',
  pod_description: 'Doubles at Court 2, all levels welcome.',
  media_text: IMG,
  venue_id: 'venue-1',
  offer_start: START,
  offer_end: END,
  venue_offer_model: 'PER_GUEST',
  venue_offer_rate: '300',
  pax: 12,
  ...over,
});

const errorsFor = (input: unknown) => {
  const result = podResubmitSchema.safeParse(input);
  if (result.success) return {} as Record<string, string>;
  return Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('buildPodResubmitSchema', () => {
  it('accepts a resubmission with a fresh venue, a window and terms', () => {
    expect(podResubmitSchema.safeParse(values()).success).toBe(true);
  });

  it('will not resubmit without a venue and a window — that is the whole point of a rejection', () => {
    expect(errorsFor(values({ venue_id: '' })).venue_id).toBe(labels.venueRequired);
    expect(errorsFor(values({ offer_start: '' })).offer_start).toBe(labels.slotRequired);
    expect(errorsFor(values({ offer_end: '' })).offer_end).toBe(labels.slotRequired);
  });

  it('asks how the new venue is paid, and for a positive amount', () => {
    expect(errorsFor(values({ venue_offer_model: 'PER_PAX' })).venue_offer_model).toBe(labels.offerModelRequired);
    expect(errorsFor(values({ venue_offer_rate: '0' })).venue_offer_rate).toBe(labels.offerRateRequired);
  });

  it('keeps the same content rules as an ordinary edit', () => {
    expect(errorsFor(values({ pod_title: 'ab' })).pod_title).toBe(labels.titleTooShort);
    expect(errorsFor(values({ pod_title: 'a'.repeat(121) })).pod_title).toBe(labels.titleTooLong);
    expect(errorsFor(values({ pod_description: 'short' })).pod_description).toBe(labels.descriptionTooShort);
    expect(errorsFor(values({ media_text: VID })).media_text).toBe(labels.imageRequired);
  });
});

describe('buildHostResubmitInput', () => {
  it('sends the trimmed copy, the typed gallery and the offer to the new venue', () => {
    expect(buildHostResubmitInput(values({ pod_title: '  Sunday Badminton  ', media_text: `${IMG}\n${VID}` }))).toEqual({
      pod_title: 'Sunday Badminton',
      pod_description: 'Doubles at Court 2, all levels welcome.',
      pod_images_and_videos: [
        { url: IMG, type: 'IMAGE' },
        { url: VID, type: 'VIDEO' },
      ],
      venue_id: 'venue-1',
      venue_offer: { start_at: START, end_at: END, space_label: '', pax: 12, pets: false, model: 'PER_GUEST', rate: 300 },
    });
  });

  it('holds no offer until the window and the terms are all there', () => {
    expect(resubmitOfferOf(values({ offer_start: '' }))).toBeNull();
    expect(resubmitOfferOf(values({ offer_end: '' }))).toBeNull();
    expect(resubmitOfferOf(values({ venue_offer_rate: '' }))).toBeNull();
  });
});

describe('buildPodResubmitModerationInput', () => {
  it('checks the copy and the images — a venue and an offer are bookings, not content', () => {
    const input = buildPodResubmitModerationInput(values({ media_text: `${IMG}\n${VID}` }));

    expect(input).toEqual({
      pod_title: 'Sunday Badminton',
      pod_description: 'Doubles at Court 2, all levels welcome.',
      image_urls: [IMG],
    });
  });
});

describe('podResubmitInitialValues', () => {
  it('keeps the rejected pod’s copy and spots but clears the venue, window and terms', () => {
    const pod = {
      pod_title: 'Sunday Badminton',
      pod_description: 'Doubles at Court 2.',
      pod_images_and_videos: [{ url: IMG, type: 'IMAGE' }],
      no_of_spots: 12,
    } as HostPodTarget;

    expect(podResubmitInitialValues(pod)).toEqual({
      ...blankPodResubmitValues,
      pod_title: 'Sunday Badminton',
      pod_description: 'Doubles at Court 2.',
      media_text: IMG,
      pax: 12,
    });
  });

  it('opens blank when there is no pod yet', () => {
    expect(podResubmitInitialValues(null)).toEqual(blankPodResubmitValues);
    expect(podResubmitInitialValues({} as HostPodTarget)).toEqual(blankPodResubmitValues);
  });
});
