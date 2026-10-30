/**
 * An offer is priced at both ends of its guests — the most (the pod's spots)
 * and the fewest the venue is paid for — and an agreed per-guest booking is
 * priced again, at completion, for the people who came: never fewer than its
 * minimum, on the charges and percents both sides agreed.
 */
import { billableGuests, freeQuote, frozenCharges, priceForGuests, quoteOffer, quoteProposal, termsProblem } from '../../venueOffer.quote';
import type { QuoteRequest, VenuePricing } from '../../../venuePricing/venuePricing.types';
import type { VenuePriceBasis } from '../../venueOffer.types';

const TZ = 'Asia/Kolkata';
const ist = (ymd: string, hhmm: string) => new Date(`${ymd}T${hhmm}:00+05:30`);

/** A venue with no charges of its own: only the offered price counts. */
const charges: VenuePricing = {
  model: null,
  base_rate: 0,
  min_pax: 0,
  max_pax: 0,
  min_hours: 0,
  max_hours: 0,
  booking_increment_minutes: 60,
  min_spend: 0,
  slots: [],
  operating_hours: [],
  price_rules: [],
  deposit: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  gst_enabled: false,
  blocked_dates: [],
};

const req = (over: Partial<QuoteRequest> = {}): QuoteRequest => ({
  start: ist('2027-01-04', '18:00'),
  end: ist('2027-01-04', '20:00'),
  pax: 20,
  commissionPct: 10,
  gstPct: 18,
  timeZone: TZ,
  ...over,
});

const perGuest = { model: 'PER_GUEST' as const, rate: 500 };

describe('quoteProposal', () => {
  it('prices a per-guest offer at the most and at the fewest guests', () => {
    const result = quoteProposal(charges, perGuest, req(), 8);
    if (!result.ok) throw new Error(result.message);
    expect(result.quote).toMatchObject({ pax: 20, base: 10_000, venue_payout: 10_000, platform_fee: 1000, total: 11_000 });
    expect(result.quote_min).toMatchObject({ pax: 8, base: 4000, venue_payout: 4000, platform_fee: 400, total: 4400 });
  });

  it("tops the fewest guests up to the venue's minimum spend, as the venue's charges say", () => {
    const result = quoteProposal({ ...charges, min_spend: 5000 }, perGuest, req(), 8);
    if (!result.ok) throw new Error(result.message);
    expect(result.quote_min).toMatchObject({ base: 4000, min_spend_top_up: 1000, venue_price: 5000 });
    expect(result.quote).toMatchObject({ base: 10_000, min_spend_top_up: 0, venue_price: 10_000 });
  });

  it('prices once when the minimum is not below the most guests, or there is none', () => {
    for (const min of [20, 25, 0, -1, Number.NaN]) {
      const result = quoteProposal(charges, perGuest, req(), min);
      if (!result.ok) throw new Error(result.message);
      expect(result.quote_min).toBe(result.quote);
    }
  });

  it('prices a flat offer the same at both ends', () => {
    const result = quoteProposal(charges, { model: 'FLAT', rate: 7000 }, req(), 8);
    if (!result.ok) throw new Error(result.message);
    expect(result.quote.venue_payout).toBe(7000);
    expect(result.quote_min.venue_payout).toBe(7000);
  });

  it('answers why the offer cannot be priced', () => {
    const result = quoteProposal(charges, perGuest, req({ end: ist('2027-01-04', '17:00') }), 8);
    expect(result).toEqual({ ok: false, code: 'INVALID_WINDOW', message: 'Pick a start and an end time' });
  });
});

describe('a free venue', () => {
  /** A venue that charges for everything: none of it applies to a window it gives away. */
  const pricey: VenuePricing = { ...charges, min_spend: 20_000, cleaning_fee: 1500, pet_fee: 500, gst_enabled: true };

  it('is priced at nothing: no rate, fees, minimum spend, GST or commission', () => {
    const result = quoteOffer(pricey, { model: 'FREE', rate: 900 }, req({ pets: true }));
    expect(result).toEqual({
      ok: true,
      breakdown: expect.objectContaining({
        model: 'FLAT',
        rate: 0,
        hours: 2,
        date: '2027-01-04',
        base: 0,
        min_spend_top_up: 0,
        cleaning_fee: 0,
        pet_fee: 0,
        taxes: 0,
        venue_payout: 0,
        platform_fee: 0,
        total: 0,
        deposit: 0,
      }),
    });
  });

  it('is priced the same at both ends of the guests', () => {
    const result = quoteProposal(pricey, { model: 'FREE', rate: 0 }, req(), 6);
    expect(result.ok && result.quote.total).toBe(0);
    expect(result.ok && result.quote_min.total).toBe(0);
  });

  it('still needs a window that ends after it starts', () => {
    expect(freeQuote(req({ end: ist('2027-01-04', '17:00') }))).toMatchObject({ ok: false, code: 'INVALID_WINDOW' });
    expect(freeQuote(req({ start: new Date('nope') }))).toMatchObject({ ok: false, code: 'INVALID_WINDOW' });
  });
});

describe('termsProblem', () => {
  it("allows a free venue only in a host's opening offer", () => {
    expect(termsProblem({ model: 'FREE', rate: 0 }, { allowFree: true })).toBeNull();
    expect(termsProblem({ model: 'FREE', rate: 0 })).toMatch(/counter names a price/);
  });

  it('needs a known priced option and an amount within bounds otherwise', () => {
    expect(termsProblem({ model: 'PER_GUEST', rate: 300 })).toBeNull();
    expect(termsProblem({ model: 'PER_SLOT' as never, rate: 300 })).toMatch(/per guest, per hour or a flat price/);
    expect(termsProblem(null)).toMatch(/per guest, per hour or a flat price/);
    expect(termsProblem({ model: 'FLAT', rate: 0 })).toBe('Enter the amount you offer the venue');
    expect(termsProblem({ model: 'FLAT', rate: 100_000_000 })).toBe('This amount is too large');
  });
});

describe('billableGuests', () => {
  it('is everyone who came, never fewer than the minimum, and at least one', () => {
    expect(billableGuests(8, 12)).toBe(12);
    expect(billableGuests(8, 5)).toBe(8);
    expect(billableGuests(0, 0)).toBe(1);
    expect(billableGuests(Number.NaN, 3)).toBe(3);
    expect(billableGuests(6, Number.NaN)).toBe(6);
    expect(billableGuests(-4, -2)).toBe(1);
    expect(billableGuests(8.7, 9.9)).toBe(9);
  });
});

describe('frozenCharges', () => {
  it("keeps the venue's charges and drops its own slots and hours", () => {
    const withOwn: VenuePricing = {
      ...charges,
      min_spend: 3000,
      slots: [{ days_of_week: [1], start_time: '10:00', end_time: '12:00', price: 900 }] as VenuePricing['slots'],
      operating_hours: [{ day: 1, open: '09:00', close: '22:00' }] as unknown as VenuePricing['operating_hours'],
    };
    expect(frozenCharges(withOwn)).toEqual({ ...charges, min_spend: 3000, slots: [], operating_hours: [] });
  });
});

describe('priceForGuests', () => {
  const window = { start: ist('2027-01-04', '18:00'), end: ist('2027-01-04', '20:00') };
  const basis: VenuePriceBasis = { model: 'PER_GUEST', rate: 500, min_guests: 8, pets: false, charges };
  const agreed = { gst_pct: 0, platform_fee_pct: 10 };

  it('pays for everyone who came above the minimum', () => {
    expect(priceForGuests(basis, window, 12, agreed, TZ)).toMatchObject({ pax: 12, venue_payout: 6000, platform_fee: 600 });
  });

  it('never pays for fewer than the minimum', () => {
    expect(priceForGuests(basis, window, 3, agreed, TZ)).toMatchObject({ pax: 8, venue_payout: 4000, platform_fee: 400 });
  });

  it('prices on the GST and commission the agreed quote carried, and the frozen pet fee', () => {
    const taxed = priceForGuests(
      { ...basis, pets: true, charges: { ...charges, gst_enabled: true, pet_fee: 200 } },
      window,
      10,
      { gst_pct: 18, platform_fee_pct: 5 },
      TZ
    );
    expect(taxed).toMatchObject({ base: 5000, pet_fee: 200, venue_price: 5200, taxes: 936, venue_payout: 6136, platform_fee: 260 });
  });

  it('is nothing for a booking that is not per guest, or was frozen without charges', () => {
    expect(priceForGuests({ ...basis, model: 'FLAT' }, window, 10, agreed, TZ)).toBeNull();
    expect(priceForGuests({ ...basis, charges: null }, window, 10, agreed, TZ)).toBeNull();
  });

  it('is nothing when the booking window cannot be priced', () => {
    expect(priceForGuests(basis, { start: window.end, end: window.start }, 10, agreed, TZ)).toBeNull();
  });
});
