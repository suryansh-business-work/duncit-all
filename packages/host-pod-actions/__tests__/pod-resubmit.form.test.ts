import { describe, expect, it } from 'vitest';

import {
  blankPodResubmitValues,
  buildHostResubmitInput,
  buildPodResubmitModerationInput,
  buildPodResubmitSchema,
  podResubmitInitialValues,
  resubmitOfferOf,
  type VenueOfferPrefill,
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
const keyT = (key: string) => `t:${key}`;
const labels = mwebHostPodLabels(keyT);
const podResubmitSchema = buildPodResubmitSchema(labels, keyT);

const values = (over: Partial<typeof blankPodResubmitValues> = {}) => ({
  ...blankPodResubmitValues,
  pod_title: 'Sunday Badminton',
  pod_description: 'Doubles at Court 2, all levels welcome.',
  media_text: IMG,
  venue_id: 'venue-1',
  offer_start: START,
  offer_end: END,
  venue_offer_model: 'PER_GUEST',
  venue_offer_rate: '300',
  offerings: 'Two courts\nShuttles',
  pax: 12,
  ...over,
});

const errorsFor = (input: unknown, schema = podResubmitSchema) => {
  const result = schema.safeParse(input);
  if (result.success) return {} as Record<string, string>;
  return Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('buildPodResubmitSchema', () => {
  it('accepts a resubmission with a fresh venue, a window, terms and what the host needs', () => {
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

  it('asks for at least one thing the host needs from the venue, each point within bounds', () => {
    expect(errorsFor(values({ offerings: '' })).offerings).toBe('t:availability.offers.validation.offeringsRequired');
    expect(errorsFor(values({ offerings: '\n- \n' })).offerings).toBe('t:availability.offers.validation.offeringsRequired');
    expect(errorsFor(values({ offerings: 'x'.repeat(121) })).offerings).toBe('t:availability.offers.validation.offeringTooLong');
  });

  it("keeps the note optional, within the server's 1000 characters", () => {
    expect(podResubmitSchema.safeParse(values({ note: '' })).success).toBe(true);
    expect(errorsFor(values({ note: 'n'.repeat(1001) })).note).toBe('t:availability.offers.validation.noteTooLong');
  });

  it('words the ask in the bundled English when the surface passes no translator', () => {
    const english = buildPodResubmitSchema(labels);
    expect(errorsFor(values({ offerings: '' }), english).offerings).toBe('Add at least one thing you need from the venue');
  });

  it('keeps the same content rules as an ordinary edit', () => {
    expect(errorsFor(values({ pod_title: 'ab' })).pod_title).toBe(labels.titleTooShort);
    expect(errorsFor(values({ pod_title: 'a'.repeat(121) })).pod_title).toBe(labels.titleTooLong);
    expect(errorsFor(values({ pod_description: 'short' })).pod_description).toBe(labels.descriptionTooShort);
    expect(errorsFor(values({ media_text: VID })).media_text).toBe(labels.imageRequired);
  });
});

describe('buildHostResubmitInput', () => {
  it('sends the trimmed copy, the typed gallery, the spots and the offer with its ask to the new venue', () => {
    expect(
      buildHostResubmitInput(values({ pod_title: '  Sunday Badminton  ', media_text: `${IMG}\n${VID}`, note: '  Bring nets  ' })),
    ).toEqual({
      pod_title: 'Sunday Badminton',
      pod_description: 'Doubles at Court 2, all levels welcome.',
      pod_images_and_videos: [
        { url: IMG, type: 'IMAGE' },
        { url: VID, type: 'VIDEO' },
      ],
      venue_id: 'venue-1',
      no_of_spots: 12,
      venue_offer: {
        start_at: START,
        end_at: END,
        space_label: '',
        pax: 12,
        pets: false,
        model: 'PER_GUEST',
        rate: 300,
        offerings: ['Two courts', 'Shuttles'],
        note: 'Bring nets',
      },
    });
  });

  it('offers the named space and says pets are coming', () => {
    expect(resubmitOfferOf(values({ space_label: 'Court 2', pets: true }))).toMatchObject({ space_label: 'Court 2', pets: true });
  });

  it("leaves the pod's spots alone while they are not known", () => {
    expect(buildHostResubmitInput(values({ pax: 0 }))).not.toHaveProperty('no_of_spots');
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
  const pod = {
    pod_title: 'Sunday Badminton',
    pod_description: 'Doubles at Court 2.',
    pod_images_and_videos: [{ url: IMG, type: 'IMAGE' }],
    no_of_spots: 12,
    venue_id: 'venue-1',
  } as HostPodTarget;

  it('keeps the rejected pod’s copy and spots but clears the venue, window and terms', () => {
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
    expect(podResubmitInitialValues(null, { model: 'FLAT' } as VenueOfferPrefill)).toEqual(blankPodResubmitValues);
  });

  const declined: VenueOfferPrefill = {
    model: 'PER_GUEST',
    rate: 350,
    offerings: ['Two courts', 'Shuttles'],
    note: 'We start sharp at 7',
    start_at: START,
    end_at: END,
    space_label: 'Court 2',
    pets: true,
  };

  it('starts a new offer from the declined terms, at the pod’s venue', () => {
    expect(podResubmitInitialValues(pod, declined)).toEqual({
      ...blankPodResubmitValues,
      pod_title: 'Sunday Badminton',
      pod_description: 'Doubles at Court 2.',
      media_text: IMG,
      pax: 12,
      venue_id: 'venue-1',
      offer_start: START,
      offer_end: END,
      space_label: 'Court 2',
      pets: true,
      venue_offer_model: 'PER_GUEST',
      venue_offer_rate: '350',
      offerings: 'Two courts\nShuttles',
      note: 'We start sharp at 7',
    });
  });

  it('leaves a pricing option or an amount it cannot use for the host to pick again', () => {
    const started = podResubmitInitialValues({ ...pod, venue_id: null }, { ...declined, model: 'PER_PAX', rate: 0 });
    expect(started).toMatchObject({ venue_id: '', venue_offer_model: '', venue_offer_rate: '' });
  });
});
