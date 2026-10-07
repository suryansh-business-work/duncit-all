import { format } from 'date-fns';

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

// With no admin settings loaded the schedule is typed in the fallback pattern:
// the keyboard form of 'dd MMM yyyy' plus 'hh:mm a'.
const TYPED_PATTERN = 'dd MM yyyy hh:mm a';
const futureStart = new Date(Date.now() + 24 * 3_600_000);
const futureText = format(futureStart, TYPED_PATTERN);
const futureEndText = format(new Date(futureStart.getTime() + 2 * 3_600_000), TYPED_PATTERN);
const pastText = '01 01 2020 10:00 AM';

// A virtual pod has no venue slot to close it, so it carries its own end, and
// its platform is picked from the shared list.
const virtualPod: Partial<CreatePodFormValues> = {
  pod_mode: 'VIRTUAL',
  venue_id: '',
  venue_slot_id: '',
  venue_space_label: '',
  meeting_platform: 'GOOGLE_MEET',
  meeting_url: 'https://meet.duncit.com/x',
  pod_end_date_time_text: futureEndText,
};

const valid = (over: Partial<CreatePodFormValues> = {}): CreatePodFormValues => ({
  ...blankCreatePodForm,
  // A pod always belongs to one of the host's approved categories — the picker
  // above the title is required.
  host_category_key: 'sc-sports|sub-hiking',
  pod_title: 'Sunday community hike',
  club_id: 'club-1',
  venue_id: 'venue-1',
  venue_slot_id: 'slot-1',
  venue_space_label: 'Main Hall',
  pod_description: 'A relaxed group hike around the lake.',
  pod_date_time_text: futureText,
  // The blank default is invalid on purpose — a paid pod must carry a price.
  pod_amount_text: '499',
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
    expect(parseDateTimeText('15 07 2026 06:30 pm')).toEqual(new Date(2026, 6, 15, 18, 30));
    expect(parseDateTimeText('')).toBeNull();
    // The old ISO-ish shape is no longer the admin's pattern.
    expect(parseDateTimeText('2026-07-15 18:30')).toBeNull();
    expect(parseDateTimeText('31 02 2026 06:30 PM')).toBeNull();
    expect(parseDateTimeText('01-07-2026 18:00')).toBeNull();
    expect(parseDateTimeText('2026-13-45 99:99')).toBeNull();
  });
});

describe('createPodSchema', () => {
  it('accepts a valid physical pod and exposes a field group per step (4 steps)', () => {
    expect(createPodSchema.safeParse(valid()).success).toBe(true);
    expect(STEP_FIELDS).toHaveLength(STEP_TITLES.length);
    expect(STEP_TITLES).toEqual([
      'Location, Category & Club',
      'Pod Basics',
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
    // Physical pod with a venue but neither a space nor a slot → the space error fires.
    expect(issuesOf(valid({ venue_space_label: '', venue_slot_id: '' }))).toContain(
      'venue_space_label',
    );
    // A pod already holding a slot (the club-admin edit) has its space booked.
    expect(issuesOf(valid({ venue_space_label: '' }))).not.toContain('venue_space_label');
    // Virtual pods never need a space.
    expect(createPodSchema.safeParse(valid(virtualPod)).success).toBe(true);
  });

  it('requires a valid meeting link, a listed platform and an end for virtual pods', () => {
    expect(issuesOf(valid({ ...virtualPod, meeting_url: '' }))).toContain('meeting_url');
    expect(issuesOf(valid({ ...virtualPod, meeting_url: 'nope' }))).toContain('meeting_url');
    expect(issuesOf(valid({ ...virtualPod, meeting_platform: 'Google meet' }))).toContain(
      'meeting_platform',
    );
    expect(issuesOf(valid({ ...virtualPod, pod_end_date_time_text: '' }))).toContain(
      'pod_end_date_time_text',
    );
    expect(createPodSchema.safeParse(valid(virtualPod)).success).toBe(true);
  });

  it('rejects past starts, ends before start, and bad numbers', () => {
    expect(issuesOf(valid({ pod_date_time_text: pastText }))).toContain('pod_date_time_text');
    expect(issuesOf(valid({ pod_end_date_time_text: pastText }))).toContain(
      'pod_end_date_time_text',
    );
    expect(issuesOf(valid({ pod_amount_text: 'abc' }))).toContain('pod_amount_text');
    expect(issuesOf(valid({ no_of_spots_text: '-2' }))).toContain('no_of_spots_text');
  });

  it('accepts only the FREE/PAID pair and keeps FREE virtual-only', () => {
    const messagesFor = (over: Partial<CreatePodFormValues>) => {
      const result = createPodSchema.safeParse(valid(over));
      return result.success
        ? []
        : result.error.issues.filter((i) => i.path[0] === 'pod_type').map((i) => i.message);
    };
    // Retired types (and anything else) are no longer a valid choice.
    expect(messagesFor({ pod_type: 'NATIVE_FREE' })).toEqual(['Select Free or Paid']);
    // An unset type also trips the base `min(1)` rule, so assert on the family choice.
    expect(messagesFor({ pod_type: '' })).toContain('Select Free or Paid');
    // FREE is virtual-only, so a physical pod may not be free.
    expect(messagesFor({ pod_type: 'FREE', pod_amount_text: '0' })).toEqual([
      'Physical pods must be paid',
    ]);
    // The two legal combinations raise nothing.
    expect(messagesFor({ pod_type: 'PAID' })).toEqual([]);
    expect(
      messagesFor({
        pod_type: 'FREE',
        pod_amount_text: '0',
        ...virtualPod,
      }),
    ).toEqual([]);
  });

  it('blocks a paid pod until the host enters a ticket price above ₹0', () => {
    // The field ships blank, so an untouched paid pod cannot be published.
    expect(blankCreatePodForm.pod_amount_text).toBe('');
    expect(issuesOf(valid({ pod_type: 'PAID', pod_amount_text: '' }))).toContain('pod_amount_text');
    expect(issuesOf(valid({ pod_type: 'PAID', pod_amount_text: ' ' }))).toContain(
      'pod_amount_text',
    );
    expect(issuesOf(valid({ pod_type: 'PAID', pod_amount_text: '0' }))).toContain(
      'pod_amount_text',
    );
    // A free pod is the only pod that may sit at ₹0.
    expect(
      createPodSchema.safeParse(
        valid({
          pod_type: 'FREE',
          pod_amount_text: '0',
          ...virtualPod,
        }),
      ).success,
    ).toBe(true);
  });

  it('forces free pods to amount 0 and rejects an incomplete product row', () => {
    expect(issuesOf(valid({ pod_type: 'FREE', pod_amount_text: '100' }))).toContain(
      'pod_amount_text',
    );
    // Products are optional (the shop flag is derived from the rows), but a row
    // without a chosen product is an incomplete association.
    expect(issuesOf(valid({ products_enabled: true, product_requests: [] }))).toEqual([]);
    expect(issuesOf(valid({ product_requests: [{ product_id: '', quantity: 2 }] }))).toContain(
      'product_requests.0.product_id',
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
    // An ordinary pod is not published against a Pod Request.
    expect(input.partner_request_id).toBeNull();
  });

  it('publishes a pod against its Pod Request when it was started from one', () => {
    expect(buildCreatePodInput(valid({ partner_request_id: 'req1' })).partner_request_id).toBe(
      'req1',
    );
  });

  it('round-trips the hidden Pod Request id through a draft', () => {
    const payload = serializeDraft(valid({ partner_request_id: 'req1' }), 2).payload;
    expect(hydrateDraft(payload).partner_request_id).toBe('req1');
    // A draft saved before the field existed resumes without one.
    expect(hydrateDraft(JSON.stringify({ pod_title: 'Old' })).partner_request_id).toBe('');
  });

  it('derives the shop flag from the product rows and nulls virtual extras', () => {
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
    // The "Attach products" switch is gone: rows present means the shop is open.
    expect(input.products_enabled).toBe(true);
    expect(input.product_requests).toEqual([{ product_id: 'p1', quantity: 3 }]);
    // A stale draft that still says "enabled" with nothing attached publishes closed.
    expect(
      buildCreatePodInput(valid({ products_enabled: true, product_requests: [] })).products_enabled,
    ).toBe(false);
    expect(input.venue_id).toBeNull();
    expect(input.venue_slot_id).toBeNull();
    expect(input.meeting_platform).toBeNull();
    expect(input.meeting_notes).toBeNull();
  });
});

describe('buildCreatePodInput fallbacks', () => {
  it('maps a free pod to ₹0 — the only pod allowed to carry no price', () => {
    const input = buildCreatePodInput(valid({ pod_type: 'FREE', pod_amount_text: '0' }));
    expect(input.pod_amount).toBe(0);
  });

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

  it('coerces a retired pod type from an old draft onto the FREE/PAID pair', () => {
    const asDraft = (over: Record<string, unknown>) =>
      hydrateDraft(JSON.stringify({ ...blankCreatePodForm, ...over })).pod_type;
    // A physical pod is always PAID, whatever the old draft stored.
    expect(asDraft({ pod_mode: 'PHYSICAL', pod_type: 'NATIVE_FREE' })).toBe('PAID');
    expect(asDraft({ pod_mode: 'PHYSICAL', pod_type: 'FREE' })).toBe('PAID');
    // A virtual pod keeps FREE and maps every retired paid type onto PAID.
    expect(asDraft({ pod_mode: 'VIRTUAL', pod_type: 'FREE' })).toBe('FREE');
    expect(asDraft({ pod_mode: 'VIRTUAL', pod_type: 'NATIVE_PAID' })).toBe('PAID');
  });
});
