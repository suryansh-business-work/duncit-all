import {
  blankPodResubmitValues,
  buildHostResubmitInput,
  makePodResubmitSchema,
  podResubmitInitialValues,
  resubmitOfferOf,
  venueOptionLabel,
  type VenueOfferPrefill,
} from '@/components/host-manage/pod-resubmit.form';

/** Echoes the key, so a test reads WHICH message was raised. */
const t = (key: string) => key;
const podResubmitSchema = makePodResubmitSchema(t);

const valid = {
  pod_title: 'Poetry evening',
  pod_description: 'An evening of poetry and calm conversation',
  media_text: 'https://img/pod.jpg',
  venue_id: 'v1',
  offer_start: '2030-03-05T12:30:00.000Z',
  offer_end: '2030-03-05T14:30:00.000Z',
  space_label: '',
  pets: false,
  venue_offer_model: 'FLAT',
  venue_offer_rate: '5000',
  offerings: 'A projector',
  note: '',
  pax: 12,
};

const issues = (values: object) => {
  const result = podResubmitSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('makePodResubmitSchema', () => {
  it('accepts a complete resubmission', () => {
    expect(podResubmitSchema.safeParse(valid).success).toBe(true);
  });

  it('requires title, description, an image, a venue and a window — in the host language', () => {
    expect(issues({ ...valid, pod_title: 'ab' })).toEqual(['mweb.hostPodActions.titleTooShort']);
    expect(issues({ ...valid, pod_title: 'a'.repeat(121) })).toEqual([
      'mweb.hostPodActions.titleTooLong',
    ]);
    expect(issues({ ...valid, pod_description: 'short' })).toEqual([
      'mweb.hostPodActions.descriptionTooShort',
    ]);
    expect(issues({ ...valid, media_text: 'https://v/clip.mp4' })).toEqual([
      'mweb.hostPodActions.imageRequired',
    ]);
    expect(issues({ ...valid, venue_id: '' })).toEqual(['mweb.hostPodActions.venueRequired']);
    expect(issues({ ...valid, offer_start: '' })).toEqual(['mweb.hostPodActions.slotRequired']);
    expect(issues({ ...valid, offer_end: '' })).toEqual(['mweb.hostPodActions.slotRequired']);
  });

  it('asks how the new venue is paid, and for a positive amount', () => {
    expect(issues({ ...valid, venue_offer_model: 'PER_PAX' })).toEqual([
      'mweb.hostPodActions.offerModelRequired',
    ]);
    expect(issues({ ...valid, venue_offer_rate: '0' })).toEqual([
      'mweb.hostPodActions.offerRateRequired',
    ]);
  });

  it('asks what the host needs from the venue, with the shared bounds on the points and the note', () => {
    expect(issues({ ...valid, offerings: ' \n- ' })).toEqual([
      'availability.offers.validation.offeringsRequired',
    ]);
    expect(issues({ ...valid, offerings: 'x'.repeat(121) })).toEqual([
      'availability.offers.validation.offeringTooLong',
    ]);
    expect(issues({ ...valid, note: 'x'.repeat(1001) })).toEqual([
      'availability.offers.validation.noteTooLong',
    ]);
  });
});

describe('buildHostResubmitInput', () => {
  it('maps values onto HostResubmitPodInput with typed media, the spots and the offer', () => {
    const input = buildHostResubmitInput({
      ...valid,
      media_text: ' https://img/a.jpg \nhttps://v/clip.mp4\n\n',
      space_label: 'Rooftop',
      pets: true,
      offerings: '- A projector\n\n10 chairs',
      note: ' Quiet corner ',
    });
    expect(input.pod_title).toBe('Poetry evening');
    expect(input.venue_id).toBe('v1');
    // The spots are the new offer's guests.
    expect(input.no_of_spots).toBe(12);
    expect(input.venue_offer).toEqual({
      start_at: valid.offer_start,
      end_at: valid.offer_end,
      space_label: 'Rooftop',
      pax: 12,
      pets: true,
      model: 'FLAT',
      rate: 5000,
      offerings: ['A projector', '10 chairs'],
      note: 'Quiet corner',
    });
    expect(input.pod_images_and_videos).toEqual([
      { url: 'https://img/a.jpg', type: 'IMAGE' },
      { url: 'https://v/clip.mp4', type: 'VIDEO' },
    ]);
  });

  it('leaves the spots alone while they are unknown', () => {
    expect(buildHostResubmitInput({ ...valid, pax: 0 })).not.toHaveProperty('no_of_spots');
  });

  it('holds no offer until the window and the terms are all there', () => {
    expect(resubmitOfferOf({ ...valid, offer_start: '' })).toBeNull();
    expect(resubmitOfferOf({ ...valid, offer_end: '' })).toBeNull();
    expect(resubmitOfferOf({ ...valid, venue_offer_model: '' })).toBeNull();
  });
});

const rejectedPod = {
  id: 'p1',
  pod_title: 'Poetry evening',
  pod_description: 'Desc long enough here',
  pod_images_and_videos: [{ url: 'https://img/a.jpg', type: 'IMAGE' }],
  venue_id: 'old-venue',
  no_of_spots: 12,
};

const declined: VenueOfferPrefill = {
  model: 'PER_GUEST',
  rate: 300,
  offerings: ['A projector', '10 chairs'],
  note: 'Quiet corner',
  start_at: '2030-03-05T12:30:00.000Z',
  end_at: '2030-03-05T14:30:00.000Z',
  space_label: 'Rooftop',
  pets: true,
};

describe('podResubmitInitialValues', () => {
  it('prefills the details and spots but always demands a fresh venue, window and terms', () => {
    const values = podResubmitInitialValues(rejectedPod);
    expect(values.pod_title).toBe('Poetry evening');
    expect(values.media_text).toBe('https://img/a.jpg');
    expect(values.venue_id).toBe(''); // the rejected venue is never pre-picked
    expect(values.offer_start).toBe('');
    expect(values.space_label).toBe('');
    expect(values.venue_offer_model).toBe('');
    expect(values.offerings).toBe('');
    expect(values.pax).toBe(12);
  });

  it('starts a new offer from the declined terms, at the pod own venue', () => {
    expect(podResubmitInitialValues(rejectedPod, declined)).toEqual(
      expect.objectContaining({
        pod_title: 'Poetry evening',
        venue_id: 'old-venue',
        offer_start: declined.start_at,
        offer_end: declined.end_at,
        space_label: 'Rooftop',
        pets: true,
        venue_offer_model: 'PER_GUEST',
        venue_offer_rate: '300',
        offerings: 'A projector\n10 chairs',
        note: 'Quiet corner',
        pax: 12,
      }),
    );
  });

  it('drops a pricing option this build does not know, and an amount of 0', () => {
    const values = podResubmitInitialValues(
      { ...rejectedPod, venue_id: null },
      { ...declined, model: 'PER_DAY', rate: 0 },
    );
    expect(values.venue_id).toBe('');
    expect(values.venue_offer_model).toBe('');
    expect(values.venue_offer_rate).toBe('');
  });

  it('handles null description/media/spots and falls back to blanks without a pod', () => {
    const values = podResubmitInitialValues({ id: 'p1', pod_title: 'T-only' });
    expect(values.pod_description).toBe('');
    expect(values.media_text).toBe('');
    expect(values.pax).toBe(0);
    expect(podResubmitInitialValues(null)).toEqual(blankPodResubmitValues);
    expect(podResubmitInitialValues(null, declined)).toEqual(blankPodResubmitValues);
  });
});

describe('option labels', () => {
  it('labels a venue with and without a city', () => {
    expect(venueOptionLabel({ id: 'v1', venue_name: 'Hall', city: 'Pune' })).toBe('Hall · Pune');
    expect(venueOptionLabel({ id: 'v1', venue_name: 'Hall', city: null })).toBe('Hall');
  });
});
