import { describe, expect, it } from 'vitest';

import {
  blankPodEditValues,
  buildHostUpdateInput,
  buildPodEditModerationInput,
  buildPodEditSchema,
  podEditInitialValues,
  spotsBoundsHint,
} from '../src/pod-edit.form';
import { mwebHostPodLabels } from '../src/labels';
import type { HostPodTarget } from '../src/types';

const IMG = 'https://cdn.duncit.com/pod/cover.jpg';
const VID = 'https://cdn.duncit.com/pod/clip.mp4';

/**
 * A validation message is copy the host reads, so the schema is built from the
 * surface's labels (rule 38). Resolving them as `t:<key>` keeps the assertions
 * about WHICH message was raised rather than about the English wording.
 */
const labels = mwebHostPodLabels((key) => `t:${key}`);
const schema = buildPodEditSchema(labels);

const values = (over: Partial<typeof blankPodEditValues> = {}) => ({
  pod_title: 'Sunday Badminton',
  pod_description: 'Doubles at Court 2, all levels welcome.',
  media_text: IMG,
  no_of_spots: 8,
  ticket_discount_enabled: false,
  ticket_discount_tiers: [],
  ...over,
});

const errorsFor = (input: unknown) => {
  const result = schema.safeParse(input);
  if (result.success) return {} as Record<string, string>;
  return Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('buildPodEditSchema', () => {
  it('accepts a complete edit', () => {
    expect(schema.safeParse(values()).success).toBe(true);
  });

  it('needs a title of at least three characters', () => {
    expect(errorsFor(values({ pod_title: 'ab' })).pod_title).toBe(labels.titleTooShort);
    expect(errorsFor(values({ pod_title: '   ' })).pod_title).toBe(labels.titleTooShort);
  });

  it('caps the title at 120 characters', () => {
    expect(errorsFor(values({ pod_title: 'a'.repeat(121) })).pod_title).toBe(labels.titleTooLong);
    expect(schema.safeParse(values({ pod_title: 'a'.repeat(120) })).success).toBe(true);
  });

  it('needs a description worth reading', () => {
    expect(errorsFor(values({ pod_description: 'too short' })).pod_description).toBe(
      labels.descriptionTooShort,
    );
  });

  it('needs at least one IMAGE, because a gallery of videos alone has no cover', () => {
    expect(errorsFor(values({ media_text: VID })).media_text).toBe(labels.imageRequired);
    expect(errorsFor(values({ media_text: '' })).media_text).toBe(labels.imageRequired);
    expect(schema.safeParse(values({ media_text: `${VID}\n${IMG}` })).success).toBe(true);
  });

  it('takes the spots as a whole number, never a negative one', () => {
    expect(schema.safeParse(values({ no_of_spots: '12' as unknown as number })).success).toBe(true);
    expect(schema.safeParse(values({ no_of_spots: 8.5 })).success).toBe(false);
    expect(schema.safeParse(values({ no_of_spots: -1 })).success).toBe(false);
  });

  // Without a discount context the dialog shows no discount, so there is none to check.
  it('leaves a discount alone when the dialog has no discount context', () => {
    const edit = values({
      ticket_discount_enabled: true,
      ticket_discount_tiers: [{ min_tickets: 99, discount_pct: 99 }],
    });
    expect(schema.safeParse(edit).success).toBe(true);
  });
});

describe('buildPodEditSchema with a discount context', () => {
  const stored = { ticket_discount_enabled: true, ticket_discount_tiers: [{ min_tickets: 2, discount_pct: 10 }] };
  const withDiscount = buildPodEditSchema(labels, { free: false, maxPct: 30, stored });

  it('validates an edited discount against the admin max and the pod capacity', () => {
    const result = withDiscount.safeParse(
      values({ ...stored, ticket_discount_tiers: [{ min_tickets: 8, discount_pct: 40 }] }),
    );

    // 8 spots sell 7 tickets — the host's own seat is free.
    const limits = { maxPct: 30, maxTickets: 7, maxTiers: 10 };
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => [i.path.join('.'), i.message])).toEqual([
      ['ticket_discount_tiers.0.min_tickets', labels.ticketDiscount.errors.TICKETS_MAX(limits)],
      ['ticket_discount_tiers.0.discount_pct', labels.ticketDiscount.errors.PCT_MAX(limits)],
    ]);
  });

  it('does not re-check a discount the host left untouched', () => {
    const lowered = buildPodEditSchema(labels, { free: false, maxPct: 5, stored });
    expect(lowered.safeParse(values(stored)).success).toBe(true);
  });
});

describe('buildHostUpdateInput', () => {
  it('trims the text and splits the gallery into typed media', () => {
    expect(
      buildHostUpdateInput(values({ pod_title: '  Sunday Badminton  ', media_text: `${IMG}\n${VID}` })),
    ).toEqual({
      pod_title: 'Sunday Badminton',
      pod_description: 'Doubles at Court 2, all levels welcome.',
      pod_images_and_videos: [
        { url: IMG, type: 'IMAGE' },
        { url: VID, type: 'VIDEO' },
      ],
    });
  });

  // Without the limits the form had no range to pick inside, and the seeded 0
  // would ask the server to empty the pod.
  it('leaves the spots out until the server limits have loaded', () => {
    expect(buildHostUpdateInput(values())).not.toHaveProperty('no_of_spots');
    expect(buildHostUpdateInput(values(), {})).not.toHaveProperty('no_of_spots');
    expect(buildHostUpdateInput(values(), { includeSpots: false })).not.toHaveProperty('no_of_spots');
  });

  it('sends the spots once there was a range to pick inside', () => {
    expect(buildHostUpdateInput(values({ no_of_spots: 12 }), { includeSpots: true })).toMatchObject({
      no_of_spots: 12,
    });
  });

  // A narrow list that never selected the tiers must not clear them on a title edit.
  it('leaves the discount out when the dialog had no discount context', () => {
    const input = buildHostUpdateInput(values(), { ticketDiscount: null });
    expect(input).not.toHaveProperty('ticket_discount_enabled');
    expect(input).not.toHaveProperty('ticket_discount_tiers');
  });

  it('sends the tiers on a paid pod, and clears them on a free one', () => {
    const tiers = [{ min_tickets: 3, discount_pct: 15 }];
    const discounted = values({ ticket_discount_enabled: true, ticket_discount_tiers: tiers });
    const stored = { ticket_discount_enabled: false, ticket_discount_tiers: [] };

    const paid = { free: false, maxPct: 50, stored };
    const free = { ...paid, free: true };

    expect(buildHostUpdateInput(discounted, { ticketDiscount: paid })).toMatchObject({
      ticket_discount_enabled: true,
      ticket_discount_tiers: tiers,
    });
    expect(buildHostUpdateInput(discounted, { ticketDiscount: free })).toMatchObject({
      ticket_discount_enabled: false,
      ticket_discount_tiers: [],
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
      no_of_spots: 8,
    } as HostPodTarget;

    expect(podEditInitialValues(pod)).toEqual({
      pod_title: 'Sunday Badminton',
      pod_description: 'Doubles at Court 2.',
      media_text: IMG,
      no_of_spots: 8,
      ticket_discount_enabled: false,
      ticket_discount_tiers: [],
    });
  });

  // Apollo's `__typename` rides on every tier the list selected; sent back inside
  // HostUpdatePodInput it would fail the mutation's validation.
  it('prefills the stored discount, tier by tier, without Apollo typenames', () => {
    const pod = {
      pod_title: 'Sunday Badminton',
      ticket_discount_enabled: true,
      ticket_discount_tiers: [
        { __typename: 'TicketDiscountTier', min_tickets: 2, discount_pct: 10 },
        { __typename: 'TicketDiscountTier', min_tickets: 4, discount_pct: 20 },
      ],
    } as unknown as HostPodTarget;

    expect(podEditInitialValues(pod)).toMatchObject({
      ticket_discount_enabled: true,
      ticket_discount_tiers: [
        { min_tickets: 2, discount_pct: 10 },
        { min_tickets: 4, discount_pct: 20 },
      ],
    });
    expect(podEditInitialValues(pod).ticket_discount_tiers[0]).not.toHaveProperty('__typename');
  });

  it('opens blank when there is no pod yet', () => {
    expect(podEditInitialValues(null)).toEqual(blankPodEditValues);
  });

  it('reads missing fields as empty rather than as the string "undefined"', () => {
    expect(podEditInitialValues({} as HostPodTarget)).toEqual(blankPodEditValues);
  });
});

describe('spotsBoundsHint', () => {
  // Two different things hold a host back, and each is a figure they can act
  // on — never a bare "invalid" on save.
  it('names the space capacity when the venue is what caps the pod', () => {
    expect(spotsBoundsHint({ min: 2, max: 20, venue_capacity: 20, seats_taken: 6 }, labels)).toBe(
      labels.spotsVenueHint(20, 6),
    );
  });

  it('names the seats already sold when those are what stop it shrinking', () => {
    expect(spotsBoundsHint({ min: 6, max: 0, venue_capacity: 0, seats_taken: 6 }, labels)).toBe(
      labels.spotsFreeHint(6, 6),
    );
  });
});
