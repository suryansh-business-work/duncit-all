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
    });
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
