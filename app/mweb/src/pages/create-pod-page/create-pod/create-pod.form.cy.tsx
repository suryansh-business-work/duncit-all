import { describe, expect, it } from 'vitest';
import {
  buildCreatePodInput,
  createPodSchema,
  hydrateDraft,
  serializeDraft,
  STEP_FIELDS,
  STEP_TITLES,
} from './create-pod.form';
import { blankCreatePodForm, type CreatePodFormValues } from './create-pod.types';

const future = (hours = 24) => new Date(Date.now() + hours * 3_600_000);
const START = future();
const END = new Date(START.getTime() + 2 * 3_600_000);

const valid = (over: Partial<CreatePodFormValues> = {}): CreatePodFormValues => ({
  ...blankCreatePodForm,
  location_id: 'loc-1',
  // A pod always belongs to one of the host's approved categories — the picker
  // above the title is required.
  host_category_key: 'sc-sports|sub-hiking',
  pod_title: 'Sunday community hike',
  club_id: 'club-1',
  venue_id: 'venue-1',
  venue_space_label: 'Whole venue',
  pod_description: 'A relaxed group hike around the lake.',
  // Booked instantly at the venue's pricing: the window is the pod window.
  pod_date_time: START,
  pod_end_date_time: END,
  // The blank default is invalid on purpose — a paid pod must carry a price.
  pod_amount: 499,
  media_text: 'https://cdn/img.jpg',
  what_this_pod_offers: ['Guided trail'],
  agreed_to_terms: true,
  ...over,
});

const issuesOf = (values: CreatePodFormValues) => {
  const result = createPodSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('createPodSchema', () => {
  it('accepts a valid physical pod', () => {
    expect(createPodSchema.safeParse(valid()).success).toBe(true);
  });

  it('requires title, club and description', () => {
    const paths = issuesOf(valid({ pod_title: 'x', club_id: '', pod_description: 'short' }));
    expect(paths).toContain('pod_title');
    expect(paths).toContain('club_id');
    expect(paths).toContain('pod_description');
  });

  it('requires a venue, a space/capacity and a booked window for physical pods', () => {
    expect(issuesOf(valid({ venue_id: '' }))).toContain('venue_id');
    expect(issuesOf(valid({ venue_space_label: '' }))).toContain('venue_space_label');
    // An instant booking needs its end too — a start alone is no booking.
    expect(issuesOf(valid({ pod_end_date_time: null }))).toContain('pod_date_time');
    // It needs no slot id: only a Pod Request books one.
    expect(issuesOf(valid({ venue_slot_id: '' }))).not.toContain('venue_slot_id');
  });

  it("requires a Pod Request's pod to keep the slot that request holds", () => {
    expect(issuesOf(valid({ partner_request_id: 'req-1', venue_slot_id: '' }))).toContain('venue_slot_id');
    expect(createPodSchema.safeParse(valid({ partner_request_id: 'req-1', venue_slot_id: 'slot-1' })).success).toBe(true);
  });

  it('requires at least one "what this pod offers" entry', () => {
    expect(issuesOf(valid({ what_this_pod_offers: [] }))).toContain('what_this_pod_offers');
    expect(createPodSchema.safeParse(valid({ what_this_pod_offers: ['Coaching'] })).success).toBe(true);
  });

  it('requires a listed platform and a valid meeting link for virtual pods (and no venue/slot)', () => {
    // A virtual pod has no slot to bound it, so it must carry its own end time.
    const virtual = {
      pod_mode: 'VIRTUAL',
      venue_id: '',
      venue_slot_id: '',
      meeting_platform: 'GOOGLE_MEET',
      pod_end_date_time: future(26),
    } as const;
    expect(issuesOf(valid({ ...virtual, meeting_url: '' }))).toContain('meeting_url');
    expect(issuesOf(valid({ ...virtual, meeting_url: 'not-a-url' }))).toContain('meeting_url');
    // The platform is picked from the shared list; free text is refused.
    expect(
      issuesOf(valid({ ...virtual, meeting_platform: 'Google meet', meeting_url: 'https://meet.duncit.com/x' })),
    ).toContain('meeting_platform');
    expect(issuesOf(valid({ ...virtual, meeting_platform: '', meeting_url: 'https://meet.duncit.com/x' }))).toContain(
      'meeting_platform',
    );
    expect(
      createPodSchema.safeParse(valid({ ...virtual, meeting_url: 'https://meet.duncit.com/x' })).success,
    ).toBe(true);
  });

  it('rejects past start dates and ends before the start', () => {
    expect(issuesOf(valid({ pod_date_time: new Date(Date.now() - 60_000) }))).toContain('pod_date_time');
    expect(issuesOf(valid({ pod_end_date_time: new Date(Date.now() + 1_800_000), pod_date_time: future() }))).toContain(
      'pod_end_date_time',
    );
  });

  it('forces free pods to amount 0 and caps paid amounts', () => {
    expect(issuesOf(valid({ pod_type: 'FREE', pod_amount: 100 }))).toContain('pod_amount');
    expect(issuesOf(valid({ pod_type: 'PAID', pod_amount: 2500 }))).toContain('pod_amount');
    expect(createPodSchema.safeParse(valid({ pod_type: 'PAID', pod_amount: 499 })).success).toBe(true);
  });

  it('blocks a paid pod until the host enters a ticket price above ₹0', () => {
    // The field ships blank, so an untouched paid pod cannot be published.
    expect(blankCreatePodForm.pod_amount).toBeNull();
    expect(issuesOf(valid({ pod_type: 'PAID', pod_amount: null }))).toContain('pod_amount');
    expect(issuesOf(valid({ pod_type: 'PAID', pod_amount: 0 }))).toContain('pod_amount');
    // A free pod is the only pod that may sit at ₹0.
    expect(
      createPodSchema.safeParse(
        valid({
          pod_type: 'FREE',
          pod_amount: 0,
          pod_mode: 'VIRTUAL',
          venue_id: '',
          venue_slot_id: '',
          meeting_platform: 'ZOOM',
          pod_end_date_time: future(26),
          meeting_url: 'https://meet.duncit.com/x',
        }),
      ).success,
    ).toBe(true);
  });

  it('lets a physical pod be free, at ₹0 and nothing else', () => {
    // `valid()` is a physical pod with a venue, a space and a slot.
    expect(valid({}).pod_mode).toBe('PHYSICAL');
    expect(createPodSchema.safeParse(valid({ pod_type: 'FREE', pod_amount: 0 })).success).toBe(true);
    expect(issuesOf(valid({ pod_type: 'FREE', pod_amount: 0 }))).not.toContain('pod_type');
    // Free still means ₹0 — a physical free pod carrying a price is refused.
    expect(issuesOf(valid({ pod_type: 'FREE', pod_amount: 250 }))).toContain('pod_amount');
  });

  it('treats products as optional — a pod with none, or with rows, both validate', () => {
    // The "Attach products" switch is gone: the shop is open exactly when the
    // pod carries rows, so "enabled but empty" is no longer a failure state.
    expect(createPodSchema.safeParse(valid({ products_enabled: true, product_requests: [] })).success).toBe(true);
    expect(
      createPodSchema.safeParse(
        valid({ products_enabled: true, product_requests: [{ product_id: 'p1', quantity: 2 }] }),
      ).success,
    ).toBe(true);
  });

  it('requires at least one image URL in the media list', () => {
    expect(issuesOf(valid({ media_text: '' }))).toContain('media_text');
    expect(issuesOf(valid({ media_text: 'https://cdn/clip.mp4' }))).toContain('media_text');
    expect(
      createPodSchema.safeParse(valid({ media_text: 'https://cdn/clip.mp4\nhttps://cdn/img.jpg' }))
        .success,
    ).toBe(true);
  });

  it('requires a pod location', () => {
    expect(issuesOf(valid({ location_id: '' }))).toContain('location_id');
  });

  it('accepts an optional reel URL (blank or a hosted video URL)', () => {
    expect(createPodSchema.safeParse(valid({ reel_url: '' })).success).toBe(true);
    expect(
      createPodSchema.safeParse(valid({ reel_url: 'https://ik.imagekit.io/pods/reels/clip.mp4' })).success,
    ).toBe(true);
  });

  it('gates publishing on accepting the Organizer Terms', () => {
    expect(issuesOf(valid({ agreed_to_terms: false }))).toContain('agreed_to_terms');
    expect(createPodSchema.safeParse(valid({ agreed_to_terms: true })).success).toBe(true);
  });

  it('exposes one field group and title per step (4 steps)', () => {
    expect(STEP_FIELDS).toHaveLength(STEP_TITLES.length);
    // The club step comes first, so its title leads.
    expect(STEP_TITLES).toEqual([
      'Location, Category & Club',
      'Pod Basics',
      'Venue & Slot',
      'Pricing & Publish',
    ]);
  });
});

describe('buildCreatePodInput', () => {
  it('maps a physical pod with hashtags, media, chips, products and charges', () => {
    const input = buildCreatePodInput(
      valid({
        pod_hashtag_text: '#weekend, #community fun',
        media_text: 'https://cdn/img.jpg\nhttps://cdn/clip.mp4\n',
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
    expect(input.what_this_pod_offers).toEqual(['Snacks', 'Guided trail']);
    expect(input.available_perks).toEqual(['Stickers']);
    expect(input.product_requests).toEqual([{ product_id: 'p1', quantity: 3 }]);
    expect(input.place_charges).toEqual([{ label: 'Entry', amount: 50, note: '' }]);
    expect(input.venue_id).toBe('venue-1');
    // Booked instantly: the window, the whole venue ('') and no slot id.
    expect(input.venue_slot_id).toBeNull();
    expect(input.venue_booking).toEqual({
      start_at: START.toISOString(),
      end_at: END.toISOString(),
      pax: null,
      pets: false,
      space_label: '',
    });
    expect(input.location_id).toBe('loc-1');
    expect(input.meeting_url).toBeNull();
    expect(input.is_active).toBe(true);
  });

  // One number: the pod's spots ARE the booking's guests, whatever the model.
  it("sends the pod's spots as the booking's guests, with pets and a named space", () => {
    const input = buildCreatePodInput(
      valid({ no_of_spots: 24, venue_booking_pets: true, venue_space_label: 'Lawn' }),
    );
    expect(input.venue_booking).toMatchObject({ pax: 24, pets: true, space_label: 'Lawn' });
  });

  it("books a Pod Request's held slot by id, with no instant booking", () => {
    const input = buildCreatePodInput(valid({ partner_request_id: 'req-1', venue_slot_id: 'slot-1' }));
    expect(input.venue_slot_id).toBe('slot-1');
    expect(input.venue_booking).toBeNull();
    expect(input.partner_request_id).toBe('req-1');
  });

  it('maps reel_url to the hosted URL, or null when blank', () => {
    expect(buildCreatePodInput(valid()).reel_url).toBeNull();
    expect(buildCreatePodInput(valid({ reel_url: 'https://cdn/reel.mp4' })).reel_url).toBe('https://cdn/reel.mp4');
  });

  it('opens the pod shop exactly when product rows exist, whatever a stale flag says', () => {
    const withRows = buildCreatePodInput(
      valid({ products_enabled: false, product_requests: [{ product_id: 'p1', quantity: 3 }] }),
    );
    expect(withRows.products_enabled).toBe(true);
    expect(withRows.product_requests).toEqual([{ product_id: 'p1', quantity: 3 }]);

    const staleFlag = buildCreatePodInput(valid({ products_enabled: true, product_requests: [] }));
    expect(staleFlag.products_enabled).toBe(false);
    expect(staleFlag.product_requests).toEqual([]);
  });

  it('maps a virtual pod with meeting fields and no venue or slot', () => {
    const input = buildCreatePodInput(
      valid({
        pod_mode: 'VIRTUAL',
        venue_id: 'ignored',
        venue_slot_id: 'ignored-slot',
        meeting_platform: 'GOOGLE_MEET',
        meeting_url: 'https://meet.duncit.com/x',
        meeting_notes: 'Join early',
      }),
    );
    expect(input.venue_id).toBeNull();
    expect(input.venue_slot_id).toBeNull();
    expect(input.venue_booking).toBeNull();
    expect(input.meeting_platform).toBe('GOOGLE_MEET');
    expect(input.meeting_url).toBe('https://meet.duncit.com/x');
    expect(input.meeting_notes).toBe('Join early');
  });
});

describe('draft serialize/hydrate', () => {
  it('round-trips values and revives Date fields', () => {
    const start = future();
    const end = future(26);
    const values = valid({
      pod_date_time: start,
      pod_end_date_time: end,
      what_this_pod_offers: ['A'],
      reel_url: 'https://cdn/reel.mp4',
      venue_booking_pets: true,
    });
    const draft = serializeDraft(values, 2);
    expect(draft.pod_title).toBe('Sunday community hike');
    expect(draft.step).toBe(2);

    const restored = hydrateDraft(draft.payload);
    expect(restored.pod_date_time?.getTime()).toBe(start.getTime());
    expect(restored.pod_end_date_time?.getTime()).toBe(end.getTime());
    expect(restored.what_this_pod_offers).toEqual(['A']);
    expect(restored.reel_url).toBe('https://cdn/reel.mp4');
    // The booking choice is restored with the draft.
    expect(restored.venue_booking_pets).toBe(true);
  });

  it('falls back to a blank form for invalid payloads', () => {
    expect(hydrateDraft('not-json')).toEqual(blankCreatePodForm);
  });
});
