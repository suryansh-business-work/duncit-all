import { describe, it, expect } from 'vitest';
import {
  buildPodInput,
  podToFormValues,
  linesToMedia,
  getProductRequestTotal,
} from '../../src/build-input';
import { makeNativeParityPodConfig } from '../../src/configs';
import {
  blankPodFormValues,
  POD_TYPES,
  OCCURRENCES,
  POD_MODES,
  type PodFormConfig,
  type PodFormValues,
} from '../../src/types';

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

const baseValues = (over: Partial<PodFormValues> = {}): PodFormValues => ({
  ...blankPodFormValues,
  ...over,
});

describe('linesToMedia', () => {
  it('maps trimmed non-empty lines to typed media by extension', () => {
    const media = linesToMedia('  https://a.com/x.jpg \n\nhttps://a.com/y.mp4\n');
    expect(media).toEqual([
      { url: 'https://a.com/x.jpg', type: 'IMAGE' },
      { url: 'https://a.com/y.mp4', type: 'VIDEO' },
    ]);
  });
});

describe('getProductRequestTotal', () => {
  const products = [
    { id: 'p1', unit_cost: 100 },
    { id: 'p2', unit_cost: 50 },
    { id: 'p3' },
  ];

  it('sums unit_cost * quantity for known products', () => {
    const total = getProductRequestTotal(
      [
        { product_id: 'p1', quantity: 2 },
        { product_id: 'p2', quantity: 3 },
      ],
      products,
    );
    expect(total).toBe(350);
  });

  it('treats missing products and unit_cost as zero and coerces quantity', () => {
    const total = getProductRequestTotal(
      [
        { product_id: 'missing', quantity: 5 },
        { product_id: 'p3', quantity: 4 },
        { product_id: 'p1', quantity: '2' as unknown as number },
      ],
      products,
    );
    expect(total).toBe(200);
  });
});

describe('buildPodInput', () => {
  it('builds a full physical input with hosts, charges, products and slot', () => {
    const input = buildPodInput(
      baseValues({
        pod_title: '  Chess Meetup  ',
        club_id: 'club-1',
        pod_mode: 'PHYSICAL',
        venue_id: 'venue-1',
        venue_slot_id: 'slot-1',
        location_id: 'loc-1',
        pod_hosts_id: ['u1', 'u2'],
        pod_description: 'desc',
        pod_date_time: new Date('2030-01-01T10:00:00.000Z'),
        pod_end_date_time: new Date('2030-01-01T12:00:00.000Z'),
        pod_type: 'NATIVE_PAID',
        pod_amount: 500,
        no_of_spots: 20,
        pod_hashtag_text: '#chess weekend, #fun',
        media_text: 'https://a.com/x.jpg',
        reel_url: '  https://a.com/reel.mp4 ',
        payment_terms: 'no refunds',
        place_charges: [
          { label: ' Entry ', amount: 100, note: ' door ' },
          { label: 'Table', amount: 0, note: '' },
        ],
        products_enabled: true,
        product_requests: [
          { product_id: 'p1', quantity: 2 },
          { product_id: '', quantity: 3 },
          { product_id: 'p2', quantity: 0 },
        ],
      }),
      { config: makeConfig({ showHosts: true, showPlaceCharges: true, showProducts: true, showVenueSlot: true }) },
    );

    expect(input.pod_title).toBe('Chess Meetup');
    expect(input.venue_id).toBe('venue-1');
    expect(input.location_id).toBe('loc-1');
    expect(input.venue_slot_id).toBe('slot-1');
    expect(input.pod_hosts_id).toEqual(['u1', 'u2']);
    expect(input.pod_hashtag).toEqual(['chess', 'weekend', 'fun']);
    expect(input.pod_date_time).toBe('2030-01-01T10:00:00.000Z');
    expect(input.pod_end_date_time).toBe('2030-01-01T12:00:00.000Z');
    expect(input.reel_url).toBe('https://a.com/reel.mp4');
    expect(input.place_charges).toEqual([
      { label: 'Entry', amount: 100, note: 'door' },
      { label: 'Table', amount: 0, note: null },
    ]);
    expect(input.products_enabled).toBe(true);
    expect(input.product_requests).toEqual([{ product_id: 'p1', quantity: 2 }]);
    expect(input.is_active).toBe(true);
  });

  it('nulls physical fields and includes meeting fields for virtual pods', () => {
    const input = buildPodInput(
      baseValues({
        pod_mode: 'VIRTUAL',
        venue_id: 'venue-1',
        location_id: 'loc-1',
        venue_slot_id: 'slot-1',
        meeting_platform: '  Zoom ',
        meeting_url: ' https://zoom.us/j/1 ',
        meeting_notes: ' bring id ',
        pod_date_time: null,
        pod_end_date_time: null,
        media_text: 'https://a.com/x.jpg',
        products_enabled: true,
        product_requests: [{ product_id: 'p1', quantity: 2 }],
        place_charges: [{ label: 'Entry', amount: 100, note: 'x' }],
      }),
      { config: makeConfig({ showPlaceCharges: true, showProducts: true, showVenueSlot: true }) },
    );

    expect(input.venue_id).toBeNull();
    expect(input.location_id).toBeNull();
    expect(input.venue_slot_id).toBeNull();
    expect(input.meeting_platform).toBe('Zoom');
    expect(input.meeting_url).toBe('https://zoom.us/j/1');
    expect(input.meeting_notes).toBe('bring id');
    expect(input.pod_date_time).toBeUndefined();
    expect(input.pod_end_date_time).toBeNull();
    expect(input.place_charges).toEqual([]);
    expect(input.products_enabled).toBe(false);
    expect(input.product_requests).toEqual([]);
  });

  it('empties meeting/location and blank optional fields to null on a minimal physical pod', () => {
    const input = buildPodInput(
      baseValues({
        pod_mode: 'VIRTUAL',
        meeting_platform: '',
        meeting_notes: '',
        media_text: '',
      }),
      { config: makeConfig() },
    );
    expect(input.meeting_platform).toBeNull();
    expect(input.meeting_notes).toBeNull();
    expect(input.reel_url).toBeNull();
    expect(input.payment_terms).toBeNull();
    expect(input.pod_hosts_id).toEqual([]);
  });

  it('nulls an empty venue slot for a physical pod when the slot field is shown', () => {
    const input = buildPodInput(
      baseValues({ pod_mode: 'PHYSICAL', venue_id: 'v1', venue_slot_id: '', media_text: '' }),
      { config: makeConfig({ showVenueSlot: true }) },
    );
    expect(input.venue_slot_id).toBeNull();
  });

  it('marks the pod inactive for a draft and omits the slot field when hidden', () => {
    const input = buildPodInput(baseValues({ media_text: '' }), {
      draft: true,
      config: makeConfig(),
    });
    expect(input.is_active).toBe(false);
    expect('venue_slot_id' in input).toBe(false);
  });
});

describe('podToFormValues', () => {
  it('fills defaults for a minimal pod', () => {
    const values = podToFormValues({});
    expect(values.pod_mode).toBe('PHYSICAL');
    expect(values.pod_type).toBe('NATIVE_FREE');
    expect(values.pod_occurrence).toBe('ONE_TIME');
    expect(values.pod_date_time).toBeNull();
    expect(values.pod_end_date_time).toBeNull();
    expect(values.media_text).toBe('');
    expect(values.is_active).toBe(true);
    expect(values.products_enabled).toBe(false);
  });

  it('hydrates a full physical pod', () => {
    const values = podToFormValues({
      pod_id: 'pod-1',
      pod_title: 'Meet',
      club_id: 'club-1',
      pod_mode: 'PHYSICAL',
      venue_id: 'venue-1',
      venue_slot_id: 'slot-1',
      pod_hosts_id: ['u1'],
      pod_date_time: '2030-01-01T10:00:00.000Z',
      pod_end_date_time: '2030-01-01T12:00:00.000Z',
      pod_amount: 300,
      no_of_spots: 15,
      pod_hashtag: ['chess', 'fun'],
      pod_images_and_videos: [{ url: 'https://a.com/x.jpg' }, { url: 'https://a.com/y.mp4' }],
      place_charges: [{ label: 'Entry', amount: 100 }],
      products_enabled: true,
      product_requests: [{ product_id: 'p1', quantity: 3 }],
    });
    expect(values.pod_date_time).toBeInstanceOf(Date);
    expect(values.pod_end_date_time).toBeInstanceOf(Date);
    expect(values.pod_hashtag_text).toBe('chess fun');
    expect(values.media_text).toBe('https://a.com/x.jpg\nhttps://a.com/y.mp4');
    expect(values.place_charges).toEqual([{ label: 'Entry', amount: 100, note: '' }]);
    expect(values.products_enabled).toBe(true);
    expect(values.product_requests).toEqual([{ product_id: 'p1', quantity: 3 }]);
  });

  it('fills defaults for place charges and product requests missing fields', () => {
    const values = podToFormValues({
      pod_mode: 'PHYSICAL',
      place_charges: [{ note: 'only note' }],
      products_enabled: true,
      product_requests: [{}],
    });
    expect(values.place_charges).toEqual([{ label: '', amount: 0, note: 'only note' }]);
    expect(values.product_requests).toEqual([{ product_id: '', quantity: 1 }]);
  });

  it('clears products for a virtual pod', () => {
    const values = podToFormValues({
      pod_mode: 'VIRTUAL',
      products_enabled: true,
      product_requests: [{ product_id: 'p1', quantity: 3 }],
    });
    expect(values.pod_mode).toBe('VIRTUAL');
    expect(values.products_enabled).toBe(false);
    expect(values.product_requests).toEqual([]);
  });
});

describe('makeNativeParityPodConfig', () => {
  it('turns on venue slots, place charges and reel with optional hosts', () => {
    const config = makeNativeParityPodConfig({ showProducts: true });
    expect(config).toMatchObject({
      showHosts: true,
      requireHosts: false,
      showVenueSlot: true,
      showPlaceCharges: true,
      showReel: true,
      showProducts: true,
    });
  });

  it('follows the products flag', () => {
    expect(makeNativeParityPodConfig({ showProducts: false }).showProducts).toBe(false);
  });
});

describe('constants', () => {
  it('exposes option lists', () => {
    expect(POD_TYPES.length).toBeGreaterThan(0);
    expect(OCCURRENCES.length).toBeGreaterThan(0);
    expect(POD_MODES).toEqual([
      { value: 'PHYSICAL', label: 'Physical' },
      { value: 'VIRTUAL', label: 'Virtual' },
    ]);
  });
});
