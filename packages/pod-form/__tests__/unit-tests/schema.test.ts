import { describe, it, expect } from 'vitest';
import { makePodSchema } from '../../src/schema';
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
  const res = makePodSchema(config).safeParse(values);
  expect(res.success).toBe(false);
  if (res.success) return [];
  return res.error.issues.map((i) => i.path.join('.'));
};

describe('makePodSchema', () => {
  it('accepts a fully valid physical free pod', () => {
    const res = makePodSchema(makeConfig()).safeParse(validValues());
    expect(res.success).toBe(true);
  });

  it('accepts a valid physical pod with place charges and paid type', () => {
    const res = makePodSchema(makeConfig({ showPlaceCharges: true })).safeParse(
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
    const res = makePodSchema(makeConfig({ showHosts: true, requireHosts: false })).safeParse(
      validValues({ pod_hosts_id: [] }),
    );
    expect(res.success).toBe(true);
  });

  it('accepts hosts when supplied and required', () => {
    const res = makePodSchema(makeConfig({ showHosts: true })).safeParse(
      validValues({ pod_hosts_id: ['u1'] }),
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
    const res = makePodSchema(makeConfig({ showVenueSlot: true })).safeParse(
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
    const res = makePodSchema(makeConfig()).safeParse(
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
    const res = makePodSchema(makeConfig({ showReel: true })).safeParse(
      validValues({ reel_url: 'https://cdn.example.com/reel.mp4' }),
    );
    expect(res.success).toBe(true);
  });

  it('requires a product when products are enabled', () => {
    const paths = errorPaths(
      makeConfig({ showProducts: true }),
      validValues({ products_enabled: true, product_requests: [] }),
    );
    expect(paths).toContain('product_requests');
  });

  it('rejects products when the toggle is off but requests remain', () => {
    const paths = errorPaths(
      makeConfig({ showProducts: true }),
      validValues({ products_enabled: false, product_requests: [{ product_id: 'p1', quantity: 2 }] }),
    );
    expect(paths).toContain('product_requests');
  });

  it('accepts enabled products with a valid request', () => {
    const res = makePodSchema(makeConfig({ showProducts: true })).safeParse(
      validValues({ products_enabled: true, product_requests: [{ product_id: 'p1', quantity: 2 }] }),
    );
    expect(res.success).toBe(true);
  });
});
