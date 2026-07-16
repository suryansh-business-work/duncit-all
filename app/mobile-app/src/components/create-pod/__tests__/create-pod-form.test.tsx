import {
  STEP_FIELDS,
  STEP_TITLES,
  buildCreatePodInput,
  createPodSchema,
  hydrateDraft,
  parseDateTimeText,
  serializeDraft,
} from '@/components/create-pod/create-pod.form';
import {
  blankCreatePodForm,
  type CreatePodFormValues,
} from '@/components/create-pod/create-pod.types';

const futureText = (() => {
  const date = new Date(Date.now() + 24 * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
})();

const valid = (over: Partial<CreatePodFormValues> = {}): CreatePodFormValues => ({
  ...blankCreatePodForm,
  pod_title: 'Sunday community hike',
  club_id: 'club-1',
  venue_id: 'venue-1',
  venue_slot_id: 'slot-1',
  venue_space_label: 'Main Hall',
  pod_description: 'A relaxed group hike around the lake.',
  pod_date_time_text: futureText,
  media_text: 'https://cdn/img.jpg',
  what_this_pod_offers: ['Snacks'],
  location_id: 'l1',
  agreed_to_terms: true,
  ...over,
});

const issuesOf = (values: CreatePodFormValues) => {
  const result = createPodSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('parseDateTimeText', () => {
  it('parses valid text and rejects bad formats/impossible dates', () => {
    expect(parseDateTimeText(futureText)).toBeInstanceOf(Date);
    expect(parseDateTimeText('')).toBeNull();
    expect(parseDateTimeText('01-07-2026 18:00')).toBeNull();
    expect(parseDateTimeText('2026-13-45 99:99')).toBeNull();
  });
});

describe('createPodSchema', () => {
  it('accepts a valid physical pod and exposes a field group per step (4 steps)', () => {
    expect(createPodSchema.safeParse(valid()).success).toBe(true);
    expect(STEP_FIELDS).toHaveLength(STEP_TITLES.length);
    expect(STEP_TITLES).toEqual([
      'Pod Basics',
      'Location, Category & Club',
      'Venue & Slot',
      'Pricing & Publish',
    ]);
  });

  it('requires title, club, description and a venue + slot for physical pods', () => {
    const paths = issuesOf(
      valid({
        pod_title: 'x',
        club_id: '',
        pod_description: 'short',
        venue_id: '',
        venue_slot_id: '',
      }),
    );
    expect(paths).toEqual(
      expect.arrayContaining([
        'pod_title',
        'club_id',
        'pod_description',
        'venue_id',
        'venue_slot_id',
      ]),
    );
  });

  it('requires at least one "what this pod offers" entry', () => {
    expect(issuesOf(valid({ what_this_pod_offers: [] }))).toContain('what_this_pod_offers');
    expect(createPodSchema.safeParse(valid({ what_this_pod_offers: ['Coaching'] })).success).toBe(
      true,
    );
  });

  it('requires a venue space/capacity for physical pods (skipped for virtual)', () => {
    // Physical pod with a venue but no space → the space error fires.
    expect(issuesOf(valid({ venue_space_label: '' }))).toContain('venue_space_label');
    // Virtual pods never need a space.
    expect(
      createPodSchema.safeParse(
        valid({
          pod_mode: 'VIRTUAL',
          venue_id: '',
          venue_slot_id: '',
          venue_space_label: '',
          meeting_url: 'https://meet.duncit.com/x',
        }),
      ).success,
    ).toBe(true);
  });

  it('requires a valid meeting link for virtual pods', () => {
    const virtual = { pod_mode: 'VIRTUAL' as const, venue_id: '', venue_slot_id: '' };
    expect(issuesOf(valid({ ...virtual, meeting_url: '' }))).toContain('meeting_url');
    expect(issuesOf(valid({ ...virtual, meeting_url: 'nope' }))).toContain('meeting_url');
    expect(
      createPodSchema.safeParse(valid({ ...virtual, meeting_url: 'https://meet.duncit.com/x' }))
        .success,
    ).toBe(true);
  });

  it('rejects past starts, ends before start, and bad numbers', () => {
    expect(issuesOf(valid({ pod_date_time_text: '2020-01-01 10:00' }))).toContain(
      'pod_date_time_text',
    );
    expect(issuesOf(valid({ pod_end_date_time_text: '2020-01-01 10:00' }))).toContain(
      'pod_end_date_time_text',
    );
    expect(issuesOf(valid({ pod_amount_text: 'abc' }))).toContain('pod_amount_text');
    expect(issuesOf(valid({ no_of_spots_text: '-2' }))).toContain('no_of_spots_text');
  });

  it('forces free pods to amount 0 and gates enabled products', () => {
    expect(issuesOf(valid({ pod_type: 'NATIVE_FREE', pod_amount_text: '100' }))).toContain(
      'pod_amount_text',
    );
    expect(issuesOf(valid({ products_enabled: true, product_requests: [] }))).toContain(
      'product_requests',
    );
    expect(
      createPodSchema.safeParse(
        valid({ products_enabled: true, product_requests: [{ product_id: 'p1', quantity: 2 }] }),
      ).success,
    ).toBe(true);
  });

  it('gates publishing on accepting the Organizer Terms', () => {
    expect(issuesOf(valid({ agreed_to_terms: false }))).toContain('agreed_to_terms');
    expect(createPodSchema.safeParse(valid({ agreed_to_terms: true })).success).toBe(true);
  });
});

describe('buildCreatePodInput', () => {
  it('throws when the start text is unparsable (guarded by the schema in the UI)', () => {
    expect(() => buildCreatePodInput(valid({ pod_date_time_text: 'nope' }))).toThrow(
      /Invalid start/,
    );
  });

  it('maps a physical pod with hashtags, media, chips, products and charges', () => {
    const input = buildCreatePodInput(
      valid({
        pod_hashtag_text: '#weekend, #community fun',
        media_text: 'https://cdn/img.jpg\nhttps://cdn/clip.mp4\n',
        reel_url: 'https://cdn/reel.mp4',
        what_this_pod_offers: ['Snacks', 'Guided trail'],
        available_perks: ['Stickers'],
        products_enabled: true,
        product_requests: [{ product_id: 'p1', quantity: 3 }],
        place_charges: [{ label: 'Entry', amount: 50, note: '' }],
      }),
    );
    expect(input.pod_hashtag).toEqual(['weekend', 'community', 'fun']);
    expect(input.pod_images_and_videos).toEqual([
      { url: 'https://cdn/img.jpg', type: 'IMAGE' },
      { url: 'https://cdn/clip.mp4', type: 'VIDEO' },
    ]);
    expect(input.reel_url).toBe('https://cdn/reel.mp4');
    expect(input.what_this_pod_offers).toEqual(['Snacks', 'Guided trail']);
    expect(input.available_perks).toEqual(['Stickers']);
    expect(input.product_requests).toEqual([{ product_id: 'p1', quantity: 3 }]);
    expect(input.place_charges).toEqual([{ label: 'Entry', amount: 50, note: '' }]);
    expect(input.venue_id).toBe('venue-1');
    expect(input.venue_slot_id).toBe('slot-1');
    expect(input.location_id).toBe('l1');
    expect(input.meeting_url).toBeNull();
    expect(input.is_active).toBe(true);
  });

  it('drops product requests when products are disabled and nulls virtual extras', () => {
    const input = buildCreatePodInput(
      valid({
        pod_mode: 'VIRTUAL',
        meeting_platform: '',
        meeting_url: 'https://meet.duncit.com/x',
        meeting_notes: '',
        products_enabled: false,
        product_requests: [{ product_id: 'p1', quantity: 3 }],
      }),
    );
    expect(input.product_requests).toEqual([]);
    expect(input.venue_id).toBeNull();
    expect(input.venue_slot_id).toBeNull();
    expect(input.meeting_platform).toBeNull();
    expect(input.meeting_notes).toBeNull();
  });
});

describe('buildCreatePodInput fallbacks', () => {
  it('nulls an unset slot, location and reel (legacy drafts)', () => {
    const input = buildCreatePodInput(valid({ venue_slot_id: '', location_id: '' }));
    expect(input.venue_slot_id).toBeNull();
    expect(input.location_id).toBeNull();
    // No reel picked → the optional field travels as null, not ''.
    expect(input.reel_url).toBeNull();
  });
});

describe('draft serialize/hydrate', () => {
  it('round-trips values and falls back to blank for invalid payloads', () => {
    const draft = serializeDraft(valid({ what_this_pod_offers: ['A'] }), 3);
    expect(draft.pod_title).toBe('Sunday community hike');
    expect(draft.step).toBe(3);
    expect(hydrateDraft(draft.payload).what_this_pod_offers).toEqual(['A']);
    expect(hydrateDraft('not-json')).toEqual(blankCreatePodForm);
  });
});
