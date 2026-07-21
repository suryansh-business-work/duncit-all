import {
  blankPodResubmitValues,
  buildHostResubmitInput,
  podResubmitInitialValues,
  podResubmitSchema,
  slotOptionLabel,
  venueOptionLabel,
  type ResubmitSlotOption,
} from '@/components/host-manage/pod-resubmit.form';

const valid = {
  pod_title: 'Poetry evening',
  pod_description: 'An evening of poetry and calm conversation',
  media_text: 'https://img/pod.jpg',
  venue_id: 'v1',
  venue_slot_id: 's1',
};

describe('podResubmitSchema', () => {
  it('accepts a complete resubmission', () => {
    expect(podResubmitSchema.safeParse(valid).success).toBe(true);
  });

  it('requires title, description, an image, a venue and a slot', () => {
    expect(podResubmitSchema.safeParse({ ...valid, pod_title: 'ab' }).success).toBe(false);
    expect(podResubmitSchema.safeParse({ ...valid, pod_description: 'short' }).success).toBe(false);
    expect(
      podResubmitSchema.safeParse({ ...valid, media_text: 'https://v/clip.mp4' }).success,
    ).toBe(false);
    expect(podResubmitSchema.safeParse({ ...valid, venue_id: '' }).success).toBe(false);
    expect(podResubmitSchema.safeParse({ ...valid, venue_slot_id: '' }).success).toBe(false);
  });
});

describe('buildHostResubmitInput', () => {
  it('maps values onto HostResubmitPodInput with typed media', () => {
    const input = buildHostResubmitInput({
      ...valid,
      media_text: ' https://img/a.jpg \nhttps://v/clip.mp4\n\n',
    });
    expect(input.pod_title).toBe('Poetry evening');
    expect(input.venue_id).toBe('v1');
    expect(input.venue_slot_id).toBe('s1');
    expect(input.pod_images_and_videos).toEqual([
      { url: 'https://img/a.jpg', type: 'IMAGE' },
      { url: 'https://v/clip.mp4', type: 'VIDEO' },
    ]);
  });
});

describe('podResubmitInitialValues', () => {
  it('prefills the details but always demands a fresh venue + slot', () => {
    const values = podResubmitInitialValues({
      id: 'p1',
      pod_title: 'Poetry evening',
      pod_description: 'Desc long enough here',
      pod_images_and_videos: [{ url: 'https://img/a.jpg', type: 'IMAGE' }],
      venue_id: 'old-venue',
    });
    expect(values.pod_title).toBe('Poetry evening');
    expect(values.media_text).toBe('https://img/a.jpg');
    expect(values.venue_id).toBe(''); // the rejected venue is never pre-picked
    expect(values.venue_slot_id).toBe('');
  });

  it('handles null description/media and falls back to blanks without a pod', () => {
    const values = podResubmitInitialValues({ id: 'p1', pod_title: 'T-only' });
    expect(values.pod_description).toBe('');
    expect(values.media_text).toBe('');
    expect(podResubmitInitialValues(null)).toEqual(blankPodResubmitValues);
  });
});

describe('option labels', () => {
  const slot: ResubmitSlotOption = {
    id: 's1',
    start_at: '2030-03-05T12:30:00.000Z',
    end_at: '2030-03-05T14:30:00.000Z',
    price: 400,
    space_label: 'Hall A',
  };

  it('joins day, window, space and price for a slot', () => {
    const label = slotOptionLabel(slot);
    expect(label).toContain('Hall A');
    expect(label).toContain('₹400');
    expect(label).toContain('–');
  });

  it('omits the space and price when absent/free', () => {
    const label = slotOptionLabel({ ...slot, price: 0, space_label: '' });
    expect(label).not.toContain('·');
  });

  it('labels a venue with and without a city', () => {
    expect(venueOptionLabel({ id: 'v1', venue_name: 'Hall', city: 'Pune' })).toBe('Hall · Pune');
    expect(venueOptionLabel({ id: 'v1', venue_name: 'Hall', city: null })).toBe('Hall');
  });
});
