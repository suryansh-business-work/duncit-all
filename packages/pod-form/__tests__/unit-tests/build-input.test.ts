import { describe, it, expect } from 'vitest';
import {
  buildPodInput,
  podToFormValues,
  linesToMedia,
  getProductRequestTotal,
  buildAutoPodInput,
  autoPodToFormValues,
  type AutoPodTemplateRow,
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

  it('counts an unparseable quantity as zero rather than NaN-poisoning the sum', () => {
    expect(getProductRequestTotal([{ product_id: 'p1', quantity: 'x' as unknown as number }], products)).toBe(0);
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
  // The VALUE is the stored enum and is a contract with the server; the name
  // beside it is a catalogue key, resolved where the menu is drawn (rule 38).
  it('exposes option lists keyed to their copy', () => {
    expect(POD_TYPES.length).toBeGreaterThan(0);
    expect(OCCURRENCES.length).toBeGreaterThan(0);
    for (const option of [...POD_TYPES, ...OCCURRENCES, ...POD_MODES]) {
      expect(option.labelKey.startsWith('podForm.')).toBe(true);
    }
    expect(POD_MODES).toEqual([
      { value: 'PHYSICAL', labelKey: 'podForm.podMode.physical' },
      { value: 'VIRTUAL', labelKey: 'podForm.podMode.virtual' },
    ]);
  });
});

describe('buildAutoPodInput', () => {
  const templateValues = (over: Partial<PodFormValues> = {}): PodFormValues => ({
    ...blankPodFormValues,
    pod_title: '  Morning Badminton  ',
    pod_description: 'Doubles at Court 2.',
    sub_category_id: 'sub-badminton',
    pod_amount: 500,
    no_of_spots: 8,
    pod_hashtag_text: '#badminton weekend',
    media_text: 'https://cdn.example.com/court.jpg\nhttps://cdn.example.com/rally.mp4',
    reel_url: '  ',
    payment_terms: '',
    what_this_pod_offers: ['Coaching'],
    available_perks: ['Water'],
    place_charges: [{ label: ' Court fee ', amount: 200, note: '' }],
    ...over,
  });

  it('sends the template only — category in place of a club, media typed, tags cleaned', () => {
    const input = buildAutoPodInput(templateValues());
    expect(input.pod_title).toBe('Morning Badminton');
    expect(input.sub_category_id).toBe('sub-badminton');
    expect(input.pod_hashtag).toEqual(['badminton', 'weekend']);
    expect(input.pod_images_and_videos).toEqual([
      { url: 'https://cdn.example.com/court.jpg', type: 'IMAGE' },
      { url: 'https://cdn.example.com/rally.mp4', type: 'VIDEO' },
    ]);
    expect(input.reel_url).toBeNull();
    expect(input.pod_mode).toBe('PHYSICAL');
    // The venue brings the slot and the HOST brings the price, the spots and
    // (on a virtual offer) the meeting — none of it is the template's, so none
    // of it is sent at all, even when the form values still carry numbers.
    expect('pod_amount' in input).toBe(false);
    expect('no_of_spots' in input).toBe(false);
    expect('pod_occurrence' in input).toBe(false);
    expect('meeting_platform' in input).toBe(false);
    expect('meeting_url' in input).toBe(false);
    expect('meeting_notes' in input).toBe(false);
    expect('pod_date_time' in input).toBe(false);
    expect('pod_end_date_time' in input).toBe(false);
    // The form has no Payment & Charges section, so neither field is the
    // template's to write: left OUT (an edit keeps what the row holds), not nulled.
    expect('payment_terms' in input).toBe(false);
    expect('place_charges' in input).toBe(false);
    // Nothing a partner supplies later rides along.
    expect('club_id' in input).toBe(false);
    expect('venue_id' in input).toBe(false);
    expect('pod_hosts_id' in input).toBe(false);
  });

  it('keeps a real reel URL', () => {
    const input = buildAutoPodInput(templateValues({ reel_url: 'https://cdn.example.com/reel.mp4' }));
    expect(input.reel_url).toBe('https://cdn.example.com/reel.mp4');
  });

  it('sends only real product rows on a physical offer, with quantities as numbers', () => {
    const input = buildAutoPodInput(
      templateValues({
        product_requests: [
          { product_id: 'prod-1', quantity: '2' as unknown as number },
          { product_id: '', quantity: 3 },
          { product_id: 'prod-2', quantity: 0 },
        ],
      }),
    );
    expect(input.product_requests).toEqual([{ product_id: 'prod-1', quantity: 2 }]);
  });

  // Even with meeting values sitting in the form, a virtual template sends
  // none of them: the host writes the meeting into their own claim. All it
  // loses beyond that are the products a virtual pod could never hand out.
  it('sends no meeting and no products for a virtual offer', () => {
    const input = buildAutoPodInput(
      templateValues({
        pod_mode: 'VIRTUAL',
        meeting_platform: ' GOOGLE_MEET ',
        meeting_url: ' https://meet.google.com/abc ',
        meeting_notes: 'Password 1234',
        pod_date_time: new Date('2030-01-05T10:00:00.000Z'),
        pod_end_date_time: new Date('2030-01-05T11:30:00.000Z'),
        product_requests: [{ product_id: 'prod-1', quantity: 2 }],
      }),
    );
    expect(input.pod_mode).toBe('VIRTUAL');
    expect('meeting_platform' in input).toBe(false);
    expect('meeting_url' in input).toBe(false);
    expect('meeting_notes' in input).toBe(false);
    expect('pod_date_time' in input).toBe(false);
    expect('pod_end_date_time' in input).toBe(false);
    expect(input.product_requests).toEqual([]);
  });
});

describe('autoPodToFormValues', () => {
  const ROW: AutoPodTemplateRow = {
    pod_title: 'Evening Chess',
    pod_description: 'Blitz rounds.',
    pod_info: 'Bring a clock.',
    pod_hashtag: ['chess', 'blitz'],
    pod_images_and_videos: [{ url: 'https://cdn.example.com/board.jpg', type: 'IMAGE' }],
    reel_url: 'https://cdn.example.com/reel.mp4',
    super_category_id: 'sup-games',
    sub_category_id: 'sub-chess',
    pod_amount: 300,
    no_of_spots: 12,
    pod_occurrence: 'WEEKLY',
    what_this_pod_offers: ['Boards'],
    available_perks: ['Coffee'],
    payment_terms: 'Pay on arrival.',
    place_charges: [{ label: 'Entry', amount: 50, note: 'at door' }],
  };

  it('rehydrates every template field the form edits', () => {
    const values = autoPodToFormValues(ROW);
    expect(values.pod_title).toBe('Evening Chess');
    expect(values.super_category_id).toBe('sup-games');
    expect(values.sub_category_id).toBe('sub-chess');
    expect(values.pod_type).toBe('PAID');
    expect(values.pod_amount).toBe(300);
    expect(values.no_of_spots).toBe(12);
    expect(values.pod_occurrence).toBe('WEEKLY');
    expect(values.pod_info).toBe('Bring a clock.');
    expect(values.pod_hashtag_text).toBe('chess blitz');
    expect(values.media_text).toBe('https://cdn.example.com/board.jpg');
    expect(values.reel_url).toBe('https://cdn.example.com/reel.mp4');
    expect(values.payment_terms).toBe('Pay on arrival.');
    expect(values.what_this_pod_offers).toEqual(['Boards']);
    expect(values.available_perks).toEqual(['Coffee']);
    expect(values.place_charges).toEqual([{ label: 'Entry', amount: 50, note: 'at door' }]);
  });

  it('falls back to the paid-template defaults on a sparse legacy row', () => {
    const values = autoPodToFormValues({
      pod_title: 'Bare',
      pod_description: 'Just a title and a picture.',
      pod_images_and_videos: [{ url: 'https://cdn.example.com/one.jpg' }],
      super_category_id: 'sup-1',
      sub_category_id: 'sub-1',
      pod_amount: undefined as unknown as number,
      no_of_spots: undefined as unknown as number,
      place_charges: [{ label: 'Entry', amount: undefined as unknown as number }],
    });
    expect(values.pod_amount).toBe(1);
    expect(values.no_of_spots).toBe(2);
    expect(values.pod_occurrence).toBe('ONE_TIME');
    expect(values.pod_hashtag_text).toBe('');
    expect(values.reel_url).toBe('');
    expect(values.payment_terms).toBe('');
    expect(values.what_this_pod_offers).toEqual([]);
    expect(values.available_perks).toEqual([]);
    expect(values.place_charges).toEqual([{ label: 'Entry', amount: 0, note: '' }]);
  });

  // Auto Pods written before these columns were required come back with nulls
  // where the schema now promises strings. The form still has to open on them.
  it('opens on a legacy row whose text columns came back null', () => {
    const values = autoPodToFormValues({
      pod_title: null,
      pod_description: null,
      pod_images_and_videos: null,
      super_category_id: null,
      sub_category_id: null,
      pod_amount: 300,
      no_of_spots: 12,
      place_charges: [{ label: null, amount: 50 }],
    } as unknown as AutoPodTemplateRow);

    expect(values.pod_title).toBe('');
    expect(values.pod_description).toBe('');
    expect(values.super_category_id).toBe('');
    expect(values.sub_category_id).toBe('');
    expect(values.media_text).toBe('');
    expect(values.place_charges).toEqual([{ label: '', amount: 50, note: '' }]);
  });
});

describe('autoPodToFormValues (virtual, products)', () => {
  const virtualRow: AutoPodTemplateRow = {
    pod_title: 'Evening Quiz',
    pod_description: 'Online quiz night.',
    pod_images_and_videos: [{ url: 'https://cdn.example.com/quiz.jpg', type: 'IMAGE' }],
    super_category_id: 'sup-games',
    sub_category_id: 'sub-quiz',
    pod_mode: 'VIRTUAL',
    meeting_platform: 'GOOGLE_MEET',
    meeting_url: 'https://meet.google.com/abc',
    meeting_notes: 'Camera on.',
    pod_date_time: '2030-01-05T10:00:00.000Z',
    pod_end_date_time: '2030-01-05T11:30:00.000Z',
    pod_amount: 200,
    no_of_spots: 10,
  };

  it('rehydrates the meeting details and window of a virtual offer', () => {
    const values = autoPodToFormValues(virtualRow);
    expect(values.pod_mode).toBe('VIRTUAL');
    expect(values.meeting_platform).toBe('GOOGLE_MEET');
    expect(values.meeting_url).toBe('https://meet.google.com/abc');
    expect(values.meeting_notes).toBe('Camera on.');
    expect(values.pod_date_time?.toISOString()).toBe('2030-01-05T10:00:00.000Z');
    expect(values.pod_end_date_time?.toISOString()).toBe('2030-01-05T11:30:00.000Z');
    expect(values.product_requests).toEqual([]);
    expect(values.products_enabled).toBe(false);
  });

  it('leaves the window empty on a virtual row that never had one', () => {
    const values = autoPodToFormValues({ ...virtualRow, pod_date_time: null, pod_end_date_time: null });
    expect(values.pod_date_time).toBeNull();
    expect(values.pod_end_date_time).toBeNull();
  });

  it('ignores stray dates on a physical row and rehydrates its product rows, defaulting a missing quantity to 1', () => {
    const values = autoPodToFormValues({
      ...virtualRow,
      pod_mode: 'PHYSICAL',
      product_requests: [
        { product_id: 'p1', quantity: 3 },
        { product_id: undefined as unknown as string, quantity: undefined as unknown as number },
      ],
    });
    expect(values.pod_mode).toBe('PHYSICAL');
    expect(values.pod_date_time).toBeNull();
    expect(values.pod_end_date_time).toBeNull();
    expect(values.products_enabled).toBe(true);
    expect(values.product_requests).toEqual([
      { product_id: 'p1', quantity: 3 },
      { product_id: '', quantity: 1 },
    ]);
  });
});
