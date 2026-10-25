/**
 * The offer as the venue's inbox, the chat and the host's pod read it: whose
 * move it is, which terms are the latest, and every proposal shown at both
 * ends of its guests — an offer written before minimums reading its guests as
 * both ends.
 */
import { awaitingParty, currentTerms, offerView, proposerOf } from '../../venueOffer.view';
import type { OfferQuote, VenueOffer, VenueOfferCounter } from '../../venueOffer.types';

const at = new Date('2027-01-01T10:00:00.000Z');
const quote = (total: number): OfferQuote => ({ total, venue_payout: total - 100, confirmed_at: at }) as unknown as OfferQuote;

const counter: VenueOfferCounter = {
  model: 'FLAT',
  rate: 9000,
  quote: quote(9900),
  quote_min: quote(9900),
  charges: null,
  min_guests: 6,
  offerings: ['Chairs'],
  note: 'Veg snacks only',
  at,
};

const offer = (over: Partial<VenueOffer> = {}): VenueOffer => ({
  model: 'PER_GUEST',
  rate: 500,
  pax: 20,
  pets: false,
  quote: quote(11_000),
  quote_min: quote(4400),
  charges: null,
  min_guests: 8,
  offerings: ['Projector', 'Snacks'],
  note: 'Keep the AC on',
  status: 'SENT',
  round: 1,
  counter: null,
  history: [{ by: 'HOST', action: 'OFFER', model: 'PER_GUEST', rate: 500, total: 11_000, min_guests: 8, note: '', at }],
  expires_at: new Date('2027-01-02T10:00:00.000Z'),
  move: 0,
  ...over,
});

const slot = (o: VenueOffer | null, over: Record<string, unknown> = {}) => ({
  _id: 'slot-1',
  venue_id: 'venue-1',
  booked_by_pod_id: 'pod-1',
  start_at: new Date('2027-01-04T12:30:00.000Z'),
  end_at: new Date('2027-01-04T14:30:00.000Z'),
  space_label: 'Terrace',
  offer: o,
  ...over,
});

describe('awaitingParty / proposerOf', () => {
  it('the venue answers the host’s terms, the host answers the venue’s, nobody once closed', () => {
    expect(awaitingParty({ status: 'SENT' })).toBe('VENUE');
    expect(awaitingParty({ status: 'COUNTERED' })).toBe('HOST');
    expect(awaitingParty({ status: 'ACCEPTED' })).toBeNull();
    expect(awaitingParty({ status: 'DECLINED' })).toBeNull();
    expect(proposerOf({ status: 'COUNTERED' })).toBe('VENUE');
    expect(proposerOf({ status: 'SENT' })).toBe('HOST');
  });
});

describe('currentTerms', () => {
  it("is the venue's counter while there is one — pending, taken or turned down", () => {
    expect(currentTerms(offer({ status: 'COUNTERED', counter }))).toBe(counter);
    expect(currentTerms(offer({ status: 'ACCEPTED', counter }))).toBe(counter);
    expect(currentTerms(offer({ status: 'DECLINED', counter }))).toBe(counter);
  });

  it("is the host's terms when there is no counter", () => {
    const o = offer();
    expect(currentTerms(o)).toBe(o);
  });
});

describe('offerView', () => {
  it('is nothing for a booking without an offer', () => {
    expect(offerView(slot(null))).toBeNull();
  });

  it('shows the host’s terms at both ends, the counter, whose move it is and the deadline', () => {
    const view = offerView(slot(offer({ status: 'COUNTERED', round: 2, counter })));
    expect(view).toMatchObject({
      slot_id: 'slot-1',
      venue_id: 'venue-1',
      pod_id: 'pod-1',
      start_at: '2027-01-04T12:30:00.000Z',
      end_at: '2027-01-04T14:30:00.000Z',
      space_label: 'Terrace',
      pax: 20,
      model: 'PER_GUEST',
      min_guests: 8,
      offerings: ['Projector', 'Snacks'],
      note: 'Keep the AC on',
      quote: { total: 11_000, confirmed_at: '2027-01-01T10:00:00.000Z' },
      quote_min: { total: 4400 },
      status: 'COUNTERED',
      round: 2,
      counter: { model: 'FLAT', rate: 9000, min_guests: 6, offerings: ['Chairs'], note: 'Veg snacks only', at: '2027-01-01T10:00:00.000Z' },
      awaiting: 'HOST',
      expires_at: '2027-01-02T10:00:00.000Z',
    });
    expect(view?.history[0]).toMatchObject({ by: 'HOST', min_guests: 8, at: '2027-01-01T10:00:00.000Z' });
  });

  it('reads an offer from before minimums as its guests at both ends, with no deadline', () => {
    const legacy = offer({ min_guests: 0, quote_min: null, offerings: undefined as never, note: undefined as never, expires_at: null });
    legacy.history = [{ by: 'HOST', action: 'OFFER', model: 'FLAT', rate: 1, total: 1, note: '', at: null as never }];
    const view = offerView(slot(legacy, { booked_by_pod_id: null, decided_pod_id: 'pod-9', space_label: null }));
    expect(view).toMatchObject({
      pod_id: 'pod-9',
      space_label: '',
      min_guests: 20,
      offerings: [],
      note: '',
      quote_min: { total: 11_000 },
      expires_at: null,
    });
    expect(view?.history[0]).toMatchObject({ min_guests: null, at: null });
  });

  it('has no pod once the booking is neither held nor decided for one', () => {
    expect(offerView(slot(offer(), { booked_by_pod_id: null }))?.pod_id).toBeNull();
  });

  it("reads a hydrated quote's fields, which sit behind getters a spread would not copy", () => {
    // A slot read without .lean() holds each quote as a subdocument: its fields
    // are not own properties of the object handed to the view.
    const fields = {
      model: 'PER_PAX',
      pax: 20,
      total: 11_800,
      venue_payout: 10_000,
      platform_fee: 1000,
      rules: [{ type: 'WEEKDAY', label: 'Friday', mode: 'PERCENT', value: 10, amount: 900, extra: 'internal' }],
      confirmed_at: at,
    };
    const hydrated = Object.create(fields) as OfferQuote;
    expect({ ...hydrated }).toEqual({});
    const view = offerView(slot(offer({ quote: hydrated, quote_min: hydrated })));
    expect(view?.quote).toMatchObject({ model: 'PER_PAX', pax: 20, total: 11_800, venue_payout: 10_000, platform_fee: 1000 });
    expect(view?.quote.rules).toEqual([{ type: 'WEEKDAY', label: 'Friday', mode: 'PERCENT', value: 10, amount: 900 }]);
    expect(view?.quote_min.confirmed_at).toBe('2027-01-01T10:00:00.000Z');
  });

  it("reads a hydrated history step's fields the same way", () => {
    const step = Object.create({ by: 'VENUE', action: 'COUNTER', model: 'PER_GUEST', rate: 600, total: 13_200, min_guests: 8, note: 'Snacks are extra', at });
    expect({ ...step }).toEqual({});
    const view = offerView(slot(offer({ history: [step] })));
    expect(view?.history).toEqual([
      { by: 'VENUE', action: 'COUNTER', model: 'PER_GUEST', rate: 600, total: 13_200, min_guests: 8, note: 'Snacks are extra', at: '2027-01-01T10:00:00.000Z' },
    ]);
  });
});
