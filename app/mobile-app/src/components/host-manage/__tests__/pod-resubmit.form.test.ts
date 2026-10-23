import {
  blankPodResubmitValues,
  buildHostResubmitInput,
  makePodResubmitSchema,
  podResubmitInitialValues,
  resubmitOfferOf,
  venueOptionLabel,
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
  venue_offer_model: 'FLAT',
  venue_offer_rate: '5000',
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
});

describe('buildHostResubmitInput', () => {
  it('maps values onto HostResubmitPodInput with typed media and the offer', () => {
    const input = buildHostResubmitInput({
      ...valid,
      media_text: ' https://img/a.jpg \nhttps://v/clip.mp4\n\n',
    });
    expect(input.pod_title).toBe('Poetry evening');
    expect(input.venue_id).toBe('v1');
    expect(input.venue_offer).toEqual({
      start_at: valid.offer_start,
      end_at: valid.offer_end,
      space_label: '',
      pax: 12,
      pets: false,
      model: 'FLAT',
      rate: 5000,
    });
    expect(input.pod_images_and_videos).toEqual([
      { url: 'https://img/a.jpg', type: 'IMAGE' },
      { url: 'https://v/clip.mp4', type: 'VIDEO' },
    ]);
  });

  it('holds no offer until the window and the terms are all there', () => {
    expect(resubmitOfferOf({ ...valid, offer_start: '' })).toBeNull();
    expect(resubmitOfferOf({ ...valid, offer_end: '' })).toBeNull();
    expect(resubmitOfferOf({ ...valid, venue_offer_model: '' })).toBeNull();
  });
});

describe('podResubmitInitialValues', () => {
  it('prefills the details and spots but always demands a fresh venue, window and terms', () => {
    const values = podResubmitInitialValues({
      id: 'p1',
      pod_title: 'Poetry evening',
      pod_description: 'Desc long enough here',
      pod_images_and_videos: [{ url: 'https://img/a.jpg', type: 'IMAGE' }],
      venue_id: 'old-venue',
      no_of_spots: 12,
    });
    expect(values.pod_title).toBe('Poetry evening');
    expect(values.media_text).toBe('https://img/a.jpg');
    expect(values.venue_id).toBe(''); // the rejected venue is never pre-picked
    expect(values.offer_start).toBe('');
    expect(values.venue_offer_model).toBe('');
    expect(values.pax).toBe(12);
  });

  it('handles null description/media/spots and falls back to blanks without a pod', () => {
    const values = podResubmitInitialValues({ id: 'p1', pod_title: 'T-only' });
    expect(values.pod_description).toBe('');
    expect(values.media_text).toBe('');
    expect(values.pax).toBe(0);
    expect(podResubmitInitialValues(null)).toEqual(blankPodResubmitValues);
  });
});

describe('option labels', () => {
  it('labels a venue with and without a city', () => {
    expect(venueOptionLabel({ id: 'v1', venue_name: 'Hall', city: 'Pune' })).toBe('Hall · Pune');
    expect(venueOptionLabel({ id: 'v1', venue_name: 'Hall', city: null })).toBe('Hall');
  });
});
