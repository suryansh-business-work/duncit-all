import { describe, expect, it } from 'vitest';
import { CREATE_POD_WHERE_STEP } from '../src/create-pod-steps';
import {
  PICK_VENUE_PARAM,
  isPickedVenue,
  pickedVenueSeed,
  venueHostTermLines,
  venueHostTermsById,
  type VenueHostTerms,
} from '../src/venue-host-terms';

/** Reads back the key and what was filled in, so each line proves its own copy. */
const t = (key: string, opts?: { vars?: Record<string, string | number>; count?: number }) => {
  const filled = opts?.count === undefined ? Object.values(opts?.vars ?? {}).join(',') : String(opts.count);
  return filled ? `${key}(${filled})` : key;
};
const money = (rupees: number) => `₹${rupees}`;

const terms = (over: Partial<VenueHostTerms> = {}): VenueHostTerms => ({
  venue_id: 'v1',
  min_guests: 0,
  min_business: [],
  min_spend: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  deposit: 0,
  gst_enabled: false,
  ...over,
});

const everything = terms({
  min_guests: 10,
  min_business: [
    { model: 'FLAT', amount: 12000 },
    { model: 'PER_GUEST', amount: 450 },
  ],
  min_spend: 5000,
  cleaning_fee: 500,
  pet_fee: 250,
  deposit: 2000,
  gst_enabled: true,
});

describe('venueHostTermLines', () => {
  it('lists the minimums an offer must meet, then the fees added to the price', () => {
    expect(venueHostTermLines(everything, t, money)).toEqual([
      { id: 'minSpend', text: 'availability.offers.minSpend.amount(₹5000)' },
      { id: 'minBusiness-PER_GUEST', text: 'availability.offers.minBusiness.perGuestAmount(₹450)' },
      { id: 'minBusiness-FLAT', text: 'availability.offers.minBusiness.perBookingAmount(₹12000)' },
      { id: 'minGuests', text: 'availability.hostTerms.minGuests(10)' },
      { id: 'cleaningFee', text: 'availability.hostTerms.cleaningFee(₹500)' },
      { id: 'petFee', text: 'availability.hostTerms.petFee(₹250)' },
      { id: 'deposit', text: 'availability.hostTerms.deposit(₹2000)' },
      { id: 'gst', text: 'availability.hostTerms.gst' },
    ]);
  });

  it('keeps only the minimums on a list card', () => {
    expect(venueHostTermLines(everything, t, money, { compact: true }).map((line) => line.id)).toEqual([
      'minSpend',
      'minBusiness-PER_GUEST',
      'minBusiness-FLAT',
      'minGuests',
    ]);
  });

  it('names the per-hour amount too', () => {
    expect(venueHostTermLines(terms({ min_business: [{ model: 'PER_HOUR', amount: 800 }] }), t, money)).toEqual([
      { id: 'minBusiness-PER_HOUR', text: 'availability.offers.minBusiness.perHourAmount(₹800)' },
    ]);
  });

  it('says nothing for a venue that sets no minimums or fees, or for no terms at all', () => {
    expect(venueHostTermLines(terms(), t, money)).toEqual([]);
    expect(venueHostTermLines(null, t, money)).toEqual([]);
    expect(venueHostTermLines(undefined, t, money, { compact: true })).toEqual([]);
  });

  it('skips amounts that are not above zero, bases it does not know and unsound numbers', () => {
    const odd = terms({
      min_guests: 0.6,
      min_business: [
        { model: 'PER_GUEST', amount: 0 },
        { model: 'PER_NIGHT', amount: 900 },
      ],
      min_spend: -10,
      cleaning_fee: Number.NaN,
      pet_fee: -1,
      deposit: 0,
    });
    expect(venueHostTermLines(odd, t, money)).toEqual([]);
  });

  it('counts whole guests only', () => {
    expect(venueHostTermLines(terms({ min_guests: 7.9 }), t, money)).toEqual([
      { id: 'minGuests', text: 'availability.hostTerms.minGuests(7)' },
    ]);
  });
});

describe('venueHostTermsById', () => {
  it('finds each venue by its id, and copes with no answer', () => {
    const byId = venueHostTermsById([terms({ venue_id: 'a' }), terms({ venue_id: 'b', min_spend: 10 })]);
    expect(byId.get('b')?.min_spend).toBe(10);
    expect(byId.get('c')).toBeUndefined();
    expect(venueHostTermsById(null).size).toBe(0);
  });
});

describe('pickedVenueSeed', () => {
  const cities = [
    { id: 'pune', location_zones: [{ zone_name: 'Koregaon Park' }, { zone_name: 'Baner' }] },
    { id: 'goa', location_zones: null },
  ];

  it("opens a physical pod at the venue, in its city and the city's spelling of its area", () => {
    expect(pickedVenueSeed({ id: 'v1', location_id: 'pune', locality: '  koregaon park ' }, cities)).toEqual({
      values: { pod_mode: 'PHYSICAL', venue_id: 'v1', location_id: 'pune', locality: 'Koregaon Park' },
      step: 0,
    });
  });

  it('leaves the area to the host when the city does not name it', () => {
    expect(pickedVenueSeed({ id: 'v1', location_id: 'pune', locality: 'Viman Nagar' }, cities).values).toEqual({
      pod_mode: 'PHYSICAL',
      venue_id: 'v1',
      location_id: 'pune',
    });
    expect(pickedVenueSeed({ id: 'v1', location_id: 'pune', locality: null }, cities).values.locality).toBeUndefined();
    expect(pickedVenueSeed({ id: 'v1', location_id: 'goa', locality: 'Baga' }, cities).values).toEqual({
      pod_mode: 'PHYSICAL',
      venue_id: 'v1',
      location_id: 'goa',
    });
  });

  it('keeps the header city when the venue has none, or one Create Pod does not offer', () => {
    expect(pickedVenueSeed({ id: 'v1', location_id: null, locality: 'Baner' }, cities).values).toEqual({
      pod_mode: 'PHYSICAL',
      venue_id: 'v1',
    });
    expect(pickedVenueSeed({ id: 'v1', location_id: 'mars' }, cities).values.location_id).toBeUndefined();
  });

  it('skips What for a host with a single category, which it picks', () => {
    expect(pickedVenueSeed({ id: 'v1' }, cities, 'super|sub')).toEqual({
      values: { pod_mode: 'PHYSICAL', venue_id: 'v1', host_category_key: 'super|sub' },
      step: CREATE_POD_WHERE_STEP,
    });
    expect(pickedVenueSeed({ id: 'v1' }, cities, '').step).toBe(0);
  });
});

describe('isPickedVenue', () => {
  it('holds only while the form is on the venue the host picked', () => {
    expect(isPickedVenue('v1', 'v1')).toBe(true);
    expect(isPickedVenue('v1', 'v2')).toBe(false);
    expect(isPickedVenue('v1', '')).toBe(false);
    expect(isPickedVenue(undefined, undefined)).toBe(false);
    expect(isPickedVenue('', '')).toBe(false);
  });
});

it('reads the picked venue from its own search param', () => {
  expect(PICK_VENUE_PARAM).toBe('pick_venue');
});
