import { describe, it, expect } from 'vitest';
import { makePodSchema } from '../../src/schema';
import { fallbackT } from '../../src/i18n/useTranslation';
import { blankPodFormValues, type PodFormConfig, type PodFormValues } from '../../src/types';

const future = () => new Date(Date.now() + 24 * 60 * 60 * 1000);
const laterThan = (d: Date) => new Date(d.getTime() + 60 * 60 * 1000);

const makeConfig = (over: Partial<PodFormConfig> = {}): PodFormConfig => ({
  showHosts: false,
  showLocationZone: false,
  showVenueSlot: false,
  showPlaceCharges: false,
  showInventory: false,
  showFinance: false,
  showIsActive: false,
  showProducts: false,
  showReel: false,
  ...over,
});

const validValues = (over: Partial<PodFormValues> = {}): PodFormValues => {
  const start = future();
  return {
    ...blankPodFormValues,
    pod_title: 'Chess Meetup',
    club_id: 'club-1',
    pod_mode: 'PHYSICAL',
    venue_id: 'venue-1',
    pod_description: 'A long enough description here.',
    pod_date_time: start,
    pod_end_date_time: laterThan(start),
    pod_type: 'NATIVE_FREE',
    pod_amount: 0,
    pod_occurrence: 'ONE_TIME',
    no_of_spots: 12,
    media_text: 'https://cdn.example.com/cover.jpg',
    ...over,
  };
};

/** Collect the issue paths from a failed parse. */
const errorPaths = (config: PodFormConfig, values: PodFormValues) => {
  const res = makePodSchema(config, fallbackT).safeParse(values);
  expect(res.success).toBe(false);
  if (res.success) return [];
  return res.error.issues.map((i) => i.path.join('.'));
};

describe('makePodSchema', () => {
  it('accepts a fully valid physical free pod', () => {
    const res = makePodSchema(makeConfig(), fallbackT).safeParse(validValues());
    expect(res.success).toBe(true);
  });

  it('accepts a valid physical pod with place charges and paid type', () => {
    const res = makePodSchema(makeConfig({ showPlaceCharges: true }), fallbackT).safeParse(
      validValues({
        pod_type: 'NATIVE_PAID',
        pod_amount: 500,
        place_charges: [{ label: 'Entry', amount: 100, note: 'at door' }],
      }),
    );
    expect(res.success).toBe(true);
  });

  it('requires at least one host when hosts are shown and required', () => {
    const paths = errorPaths(makeConfig({ showHosts: true }), validValues({ pod_hosts_id: [] }));
    expect(paths).toContain('pod_hosts_id');
  });

  it('does not require hosts when requireHosts is false', () => {
    const res = makePodSchema(makeConfig({ showHosts: true, requireHosts: false }), fallbackT).safeParse(
      validValues({ pod_hosts_id: [] }),
    );
    expect(res.success).toBe(true);
  });

  it('accepts hosts when supplied and required', () => {
    const res = makePodSchema(makeConfig({ showHosts: true }), fallbackT).safeParse(
      validValues({ pod_hosts_id: ['u1'] }),
    );
    expect(res.success).toBe(true);
  });

  it('rejects a second host when singleHost is on', () => {
    const paths = errorPaths(
      makeConfig({ showHosts: true, singleHost: true }),
      validValues({ pod_hosts_id: ['u1', 'u2'] }),
    );
    expect(paths).toContain('pod_hosts_id');
  });

  it('accepts exactly one host when singleHost is on', () => {
    const res = makePodSchema(makeConfig({ showHosts: true, singleHost: true }), fallbackT).safeParse(
      validValues({ pod_hosts_id: ['u1'] }),
    );
    expect(res.success).toBe(true);
  });

  it('allows several hosts when singleHost is off', () => {
    const res = makePodSchema(makeConfig({ showHosts: true }), fallbackT).safeParse(
      validValues({ pod_hosts_id: ['u1', 'u2'] }),
    );
    expect(res.success).toBe(true);
  });

  it('requires a venue for physical pods', () => {
    const paths = errorPaths(makeConfig(), validValues({ venue_id: '' }));
    expect(paths).toContain('venue_id');
  });

  it('requires a slot when the slot picker is on and dates are missing', () => {
    const paths = errorPaths(
      makeConfig({ showVenueSlot: true }),
      validValues({ venue_slot_id: '', pod_date_time: null }),
    );
    expect(paths).toContain('venue_slot_id');
    expect(paths).toContain('pod_date_time');
  });

  it('does not require a slot when dates are already present (edit keeps booked slot)', () => {
    const res = makePodSchema(makeConfig({ showVenueSlot: true }), fallbackT).safeParse(
      validValues({ venue_slot_id: '' }),
    );
    expect(res.success).toBe(true);
  });

  it('requires a meeting link for virtual pods', () => {
    const paths = errorPaths(
      makeConfig(),
      validValues({ pod_mode: 'VIRTUAL', venue_id: '', meeting_url: '' }),
    );
    expect(paths).toContain('meeting_url');
  });

  it('rejects an invalid meeting link', () => {
    const paths = errorPaths(
      makeConfig(),
      validValues({ pod_mode: 'VIRTUAL', venue_id: '', meeting_url: 'not-a-url' }),
    );
    expect(paths).toContain('meeting_url');
  });

  it('accepts a valid https meeting link for virtual pods', () => {
    const res = makePodSchema(makeConfig(), fallbackT).safeParse(
      validValues({ pod_mode: 'VIRTUAL', venue_id: '', meeting_url: 'https://meet.google.com/abc' }),
    );
    expect(res.success).toBe(true);
  });

  it('requires a start date/time', () => {
    const paths = errorPaths(makeConfig(), validValues({ pod_date_time: null }));
    expect(paths).toContain('pod_date_time');
  });

  it('rejects a start date/time in the past', () => {
    const paths = errorPaths(
      makeConfig(),
      validValues({ pod_date_time: new Date(Date.now() - 60_000) }),
    );
    expect(paths).toContain('pod_date_time');
  });

  it('rejects an end date/time before the start', () => {
    const start = future();
    const paths = errorPaths(
      makeConfig(),
      validValues({ pod_date_time: start, pod_end_date_time: new Date(start.getTime() - 1000) }),
    );
    expect(paths).toContain('pod_end_date_time');
  });

  it('forces free pods to have amount 0', () => {
    const paths = errorPaths(
      makeConfig(),
      validValues({ pod_type: 'NATIVE_FREE', pod_amount: 200 }),
    );
    expect(paths).toContain('pod_amount');
  });

  it('rejects a non-numeric amount', () => {
    const paths = errorPaths(
      makeConfig(),
      validValues({ pod_type: 'NATIVE_PAID', pod_amount: '' as unknown as number }),
    );
    expect(paths).toContain('pod_amount');
  });

  it('requires at least one image (video-only media fails)', () => {
    const paths = errorPaths(
      makeConfig(),
      validValues({ media_text: 'https://cdn.example.com/clip.mp4' }),
    );
    expect(paths).toContain('media_text');
  });

  it('rejects an invalid reel URL when reels are shown', () => {
    const paths = errorPaths(
      makeConfig({ showReel: true }),
      validValues({ reel_url: 'bad-reel' }),
    );
    expect(paths).toContain('reel_url');
  });

  it('accepts a valid reel URL when reels are shown', () => {
    const res = makePodSchema(makeConfig({ showReel: true }), fallbackT).safeParse(
      validValues({ reel_url: 'https://cdn.example.com/reel.mp4' }),
    );
    expect(res.success).toBe(true);
  });

  // `products_enabled` is derived from the rows (the switch is gone), so the
  // old switch-vs-rows rules no longer exist: no rows is simply "no products".
  it('accepts an empty product list whatever the derived flag says', () => {
    const res = makePodSchema(makeConfig({ showProducts: true }), fallbackT).safeParse(
      validValues({ products_enabled: true, product_requests: [] }),
    );
    expect(res.success).toBe(true);
  });

  it('rejects a product row that names no product', () => {
    const paths = errorPaths(
      makeConfig({ showProducts: true }),
      validValues({ product_requests: [{ product_id: '', quantity: 2 }] }),
    );
    expect(paths).toContain('product_requests.0.product_id');
  });

  it('rejects products on a virtual pod, which has nowhere to hand them out', () => {
    const paths = errorPaths(
      makeConfig({ showProducts: true }),
      validValues({
        pod_mode: 'VIRTUAL',
        venue_id: '',
        meeting_url: 'https://meet.example.com/x',
        product_requests: [{ product_id: 'p1', quantity: 2 }],
      }),
    );
    expect(paths).toContain('product_requests');
  });

  it('ignores product rows when the config hides products', () => {
    const res = makePodSchema(makeConfig(), fallbackT).safeParse(
      validValues({
        pod_mode: 'VIRTUAL',
        venue_id: '',
        meeting_url: 'https://meet.example.com/x',
        product_requests: [{ product_id: 'p1', quantity: 2 }],
      }),
    );
    expect(res.success).toBe(true);
  });

  it('accepts enabled products with a valid request', () => {
    const res = makePodSchema(makeConfig({ showProducts: true }), fallbackT).safeParse(
      validValues({ products_enabled: true, product_requests: [{ product_id: 'p1', quantity: 2 }] }),
    );
    expect(res.success).toBe(true);
  });
});

describe('makePodSchema - venue and date guards', () => {
  it('requires a club on an ordinary pod', () => {
    const paths = errorPaths(makeConfig(), validValues({ club_id: '' }));
    expect(paths).toContain('club_id');
  });

  it('requires an end for a virtual pod - it closes the meeting attendance window', () => {
    const paths = errorPaths(
      makeConfig(),
      validValues({
        pod_mode: 'VIRTUAL',
        venue_id: '',
        meeting_url: 'https://meet.example.com/x',
        pod_end_date_time: null,
      }),
    );
    expect(paths).toContain('pod_end_date_time');
  });
});

// Auto Pod mode swaps the club/venue/host/date rules for the template's own -
// none of those exist until a venue, a host and a club admin enrol.
describe('makePodSchema (autoPod)', () => {
  const autoConfig = makeConfig({ autoPod: true, showReel: true });
  const template = (over: Partial<PodFormValues> = {}): PodFormValues => ({
    ...blankPodFormValues,
    pod_title: 'Morning Badminton',
    pod_description: 'Doubles at Court 2, all levels.',
    sub_category_id: 'sub-badminton',
    pod_type: 'PAID',
    pod_amount: 500,
    no_of_spots: 8,
    media_text: 'https://cdn.example.com/court.jpg',
    ...over,
  });

  it('accepts a valid template with no club, venue, host or date', () => {
    const res = makePodSchema(autoConfig, fallbackT).safeParse(template());
    expect(res.success).toBe(true);
  });

  it('requires the category that stands in for the club', () => {
    const paths = errorPaths(autoConfig, template({ sub_category_id: '' }));
    expect(paths).toContain('sub_category_id');
  });

  // The price and the spots are the HOST's, set when they assign themselves
  // against the venue's real slot price — so a template carrying neither is
  // valid, and the server judges the numbers at the claim instead.
  it('faults neither the price nor the spots — the template has none', () => {
    const res = makePodSchema(autoConfig, fallbackT).safeParse(template({ pod_amount: 0, no_of_spots: 0 }));
    expect(res.success).toBe(true);
  });

  it('still needs one image', () => {
    const paths = errorPaths(autoConfig, template({ media_text: 'https://cdn.example.com/clip.mp4' }));
    expect(paths).toContain('media_text');
  });

  it('still validates the optional reel URL', () => {
    const paths = errorPaths(autoConfig, template({ reel_url: 'not-a-url' }));
    expect(paths).toContain('reel_url');
  });
});

describe('makePodSchema (autoPod, virtual)', () => {
  const autoConfig = makeConfig({ autoPod: true, showProducts: true });
  const virtual = (over: Partial<PodFormValues> = {}): PodFormValues => ({
    ...blankPodFormValues,
    pod_title: 'Evening Quiz',
    pod_description: 'Online quiz night for everyone.',
    sub_category_id: 'sub-quiz',
    pod_type: 'PAID',
    pod_amount: 200,
    no_of_spots: 10,
    media_text: 'https://cdn.example.com/quiz.jpg',
    pod_mode: 'VIRTUAL',
    ...over,
  });

  it('accepts a virtual template with no meeting link and no window', () => {
    expect(makePodSchema(autoConfig, fallbackT).safeParse(virtual()).success).toBe(true);
  });

  // The host writes the meeting into their own claim, so the template neither
  // asks for it nor faults its absence — `autoPodHostMeetingReady` gates the
  // claim, and the server refuses one without it.
  it('faults neither the meeting link nor the window', () => {
    const res = makePodSchema(autoConfig, fallbackT).safeParse(
      virtual({ meeting_url: '', pod_date_time: null, pod_end_date_time: null }),
    );
    expect(res.success).toBe(true);
  });

  it('cannot carry products', () => {
    expect(errorPaths(autoConfig, virtual({ product_requests: [{ product_id: 'p1', quantity: 1 }] }))).toContain(
      'product_requests',
    );
  });

  it('asks nothing about meetings or dates of a physical template', () => {
    const res = makePodSchema(autoConfig, fallbackT).safeParse(
      virtual({ pod_mode: 'PHYSICAL', meeting_url: '', pod_date_time: null, pod_end_date_time: null }),
    );
    expect(res.success).toBe(true);
  });
});
