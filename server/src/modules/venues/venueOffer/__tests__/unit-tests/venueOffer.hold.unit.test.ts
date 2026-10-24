/**
 * The pure parts of holding and closing an offer: when the other side must
 * answer by, which agreed bookings are priced again for the people who came,
 * and what accepting freezes.
 */
import { answerDeadline, basisOf, freezeAgreedTerms } from '../../venueOffer.hold';
import type { IVenueSlot } from '../../../venueSlot/venueSlot.model';
import type { OfferCharges, OfferQuote, VenueOffer, VenueOfferCounter } from '../../venueOffer.types';

const HOUR = 3_600_000;
const quote = (venue_payout: number) => ({ venue_payout, total: venue_payout + 100, confirmed_at: new Date(0) }) as unknown as OfferQuote;
const charges = { min_spend: 0 } as unknown as OfferCharges;

const offer = (over: Partial<VenueOffer> = {}): VenueOffer => ({
  model: 'PER_GUEST',
  rate: 500,
  pax: 20,
  pets: true,
  quote: quote(10_000),
  quote_min: quote(4000),
  charges,
  min_guests: 8,
  offerings: [],
  note: '',
  status: 'SENT',
  round: 1,
  counter: null,
  history: [],
  expires_at: new Date(),
  move: 0,
  ...over,
});

describe('answerDeadline', () => {
  const from = new Date('2027-01-01T00:00:00.000Z');

  it('is the response time from now', () => {
    const start = new Date(from.getTime() + 100 * HOUR);
    expect(answerDeadline(24, start, from)).toEqual(new Date(from.getTime() + 24 * HOUR));
  });

  it('is never past the booking’s own start', () => {
    const start = new Date(from.getTime() + 5 * HOUR);
    expect(answerDeadline(24, start, from)).toEqual(start);
  });

  it('gives at least an hour, whatever was configured', () => {
    const start = new Date(from.getTime() + 100 * HOUR);
    expect(answerDeadline(0, start, from)).toEqual(new Date(from.getTime() + HOUR));
  });
});

describe('basisOf', () => {
  it('freezes a per-guest offer with a minimum: rate, minimum, pets and charges', () => {
    expect(basisOf({ offer: offer() })).toEqual({ model: 'PER_GUEST', rate: 500, min_guests: 8, pets: true, charges });
  });

  it("freezes the venue's counter when that is what was agreed", () => {
    const counter: VenueOfferCounter = { ...offer(), model: 'PER_GUEST', rate: 650, min_guests: 10, at: new Date() };
    expect(basisOf({ offer: offer({ counter }) })).toMatchObject({ rate: 650, min_guests: 10 });
  });

  it('is nothing for every other booking — they keep the price they were agreed at', () => {
    expect(basisOf({ offer: null })).toBeNull();
    expect(basisOf({ offer: offer({ model: 'FLAT' }) })).toBeNull();
    expect(basisOf({ offer: offer({ min_guests: 0 }) })).toBeNull();
    expect(basisOf({ offer: offer({ charges: null }) })).toBeNull();
  });
});

describe('freezeAgreedTerms', () => {
  const slotFor = (o: VenueOffer | null) =>
    ({ offer: o, price_snapshot: null, price_basis: null, price: 0, overtime_rate: 0, markModified: jest.fn() }) as unknown as IVenueSlot;

  it('does nothing to a booking without an offer', () => {
    const slot = slotFor(null);
    freezeAgreedTerms(slot, 'VENUE');
    expect(slot.price_snapshot).toBeNull();
    expect(slot.markModified).not.toHaveBeenCalled();
  });

  it('freezes the latest terms as the price, closes the offer and records who accepted', () => {
    const at = new Date('2027-01-02T00:00:00.000Z');
    const slot = slotFor(offer());
    freezeAgreedTerms(slot, 'VENUE', at);
    expect(slot.offer).toMatchObject({ status: 'ACCEPTED', expires_at: null });
    expect(slot.offer?.history.at(-1)).toEqual({
      by: 'VENUE',
      action: 'ACCEPT',
      model: 'PER_GUEST',
      rate: 500,
      total: 10_100,
      min_guests: 8,
      note: '',
      at,
    });
    expect(slot.price_snapshot).toMatchObject({ venue_payout: 10_000, confirmed_at: at });
    expect(slot.price).toBe(10_000);
    expect(slot.overtime_rate).toBe(0);
    expect(slot.price_basis).toMatchObject({ rate: 500, min_guests: 8 });
    expect(slot.markModified).toHaveBeenCalledWith('offer');
  });

  it('prices extra hours at an agreed hourly rate, and records no minimum when there was none', () => {
    const slot = slotFor(offer({ model: 'PER_HOUR', rate: 1200, min_guests: 0 }));
    freezeAgreedTerms(slot, 'HOST');
    expect(slot.overtime_rate).toBe(1200);
    expect(slot.price_basis).toBeNull();
    expect(slot.offer?.history.at(-1)).toMatchObject({ by: 'HOST', min_guests: null });
  });
});
