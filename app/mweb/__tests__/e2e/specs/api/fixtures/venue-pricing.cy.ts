/// <reference types="cypress" />
import { expectRefused } from '../../../support/access-steps';
import { foreignVenueId, memberId, refusal } from '../../../support/api-apps';
import { ensureVenue, signInRunPartner, type FixtureVenue } from '../../../support/fixture-world';

/**
 * Venue Pricing Module (/venues/pricing), as the owner of the run's own venue.
 * Scenario map: Apps › Venue Pricing Module ("Set the pricing model and see the
 * live preview", "Change one date from the calendar").
 *
 * venuePricing.service.ts prices a window with the owner's UNSAVED draft
 * (venuePriceQuote) through the same validation and calculation the save uses
 * (cleanVenuePricing, quoteVenuePrice): base × guests, weekday surcharges on
 * top, and a date override replacing every other rule for its day; Duncit's fee
 * is added on top of what the venue receives. updateVenuePricing checks the
 * venue is the caller's before it reads the input. The one save made here is
 * read back and the venue's own pricing is put back after the spec.
 */

const PRICING_FIELDS = `model configured base_rate min_pax max_pax min_hours max_hours booking_increment_minutes min_spend
  slots { start_time end_time price days_of_week }
  operating_hours { day open close }
  price_rules { type label days dates from to mode value }
  deposit cleaning_fee pet_fee gst_enabled blocked_dates`;
const READ = `query E2eVenuePricing($id: ID!) { venuePricing(venue_id: $id) { ${PRICING_FIELDS} } }`;
const SAVE = `mutation E2eSaveVenuePricing($id: ID!, $input: VenuePricingInput!) {
  updateVenuePricing(venue_id: $id, input: $input) { model configured base_rate min_pax price_rules { type mode value days } }
}`;
const QUOTE = `query E2eVenuePriceQuote($id: ID!, $booking: InstantBookingInput!, $draft: VenuePricingInput) {
  venuePriceQuote(venue_id: $id, booking: $booking, draft: $draft) {
    model rate pax date base rules { type mode value amount } rules_total venue_price
    venue_payout platform_fee_pct platform_fee total
  }
}`;

interface Quote {
  model: string;
  rate: number;
  pax: number;
  date: string;
  base: number;
  rules: Array<{ type: string; mode: string; value: number; amount: number }>;
  rules_total: number;
  venue_price: number;
  venue_payout: number;
  platform_fee_pct: number;
  platform_fee: number;
  total: number;
}

/** A read pricing as the input that saves it again: everything but the derived `configured`. */
function asInput(pricing: Record<string, unknown>): Record<string, unknown> {
  const input = { ...pricing };
  delete input.configured;
  return input;
}

const DAY_MS = 86_400_000;
const SATURDAY = 6;

/** A Saturday two weeks out at 10:00 UTC — the same Saturday in India, where the app's days are counted. */
function saturdayAt10(): Date {
  const day = new Date(Date.now() + 14 * DAY_MS);
  day.setUTCHours(10, 0, 0, 0);
  return new Date(day.getTime() + ((SATURDAY - day.getUTCDay() + 7) % 7) * DAY_MS);
}
const ymd = (date: Date) => date.toISOString().slice(0, 10);
const window2h = (start: Date, pax: number) => ({
  start_at: start.toISOString(),
  end_at: new Date(start.getTime() + 2 * 3_600_000).toISOString(),
  pax,
});

/** Per person at ₹300, one guest minimum, Saturdays 20% dearer. */
const DRAFT = {
  model: 'PER_PAX',
  base_rate: 300,
  min_pax: 1,
  max_pax: 0,
  price_rules: [{ type: 'WEEKDAY_SURCHARGE', label: 'Saturday', days: [SATURDAY], mode: 'PERCENT', value: 20 }],
};

/** What Duncit's fee adds on top, rounded as the server rounds money. */
function expectFeeOnTop(q: Quote): void {
  expect(q.platform_fee, 'the fee is its percentage of the venue price').to.be.closeTo((q.venue_price * q.platform_fee_pct) / 100, 0.01);
  expect(q.total, 'guests pay the venue’s payout plus the fee').to.be.closeTo(q.venue_payout + q.platform_fee, 0.001);
}

describe('API · Venue pricing: the owner previews and saves the price hosts book at', { testIsolation: false }, () => {
  const saturday = saturdayAt10();
  const monday = new Date(saturday.getTime() + 2 * DAY_MS);
  let token = '';
  let venue: FixtureVenue;
  let foreignId = '';
  let original: Record<string, unknown> | null = null;

  const quote = (start: Date, pax: number, draft: Record<string, unknown> | null = DRAFT) =>
    cy.gqlRaw(QUOTE, { id: venue.id, booking: window2h(start, pax), draft }, { token });

  before(() => {
    signInRunPartner().then((partner) => {
      token = partner;
      ensureVenue(partner).then((found) => {
        venue = found;
        cy.gql<{ venuePricing: Record<string, unknown> }>(READ, { id: found.id }, { token: partner }).then(({ venuePricing }) => {
          original = asInput(venuePricing);
        });
      });
      memberId(partner).then((ownId) =>
        foreignVenueId(partner, ownId).then((id) => {
          foreignId = id;
        }),
      );
    });
  });

  after(() => {
    if (original) cy.gql(SAVE, { id: venue.id, input: original }, { token });
  });

  it('VPR-01 another owner’s venue can be neither previewed nor saved', () => {
    const notYours = refusal('FORBIDDEN', 'Not your venue');
    cy.gqlRaw(QUOTE, { id: foreignId, booking: window2h(saturday, 20), draft: DRAFT }, { token }).then((body) =>
      expectRefused('venuePriceQuote', body, notYours),
    );
    cy.gqlRaw(SAVE, { id: foreignId, input: DRAFT }, { token }).then((body) => expectRefused('updateVenuePricing', body, notYours));
  });

  it('VPR-02 a quote without the owner’s draft is the retired host booking path, and is refused', () => {
    quote(saturday, 20, null).then((body) =>
      expectRefused(
        'venuePriceQuote',
        body,
        refusal('FAILED_PRECONDITION', 'Venues are booked with an offer now. Please update the app to book this venue.'),
      ),
    );
  });

  it('VPR-03 20 guests on a Saturday: 20 × ₹300 = ₹6,000, +20% = ₹7,200 to the venue, Duncit’s fee on top', () => {
    quote(saturday, 20).then((body) => {
      expect(body.errors).to.be.undefined;
      const q = body.data?.venuePriceQuote as Quote;
      expect(q).to.deep.include({ model: 'PER_PAX', rate: 300, pax: 20, date: ymd(saturday), base: 6000, rules_total: 1200, venue_price: 7200 });
      expect(q.rules).to.deep.equal([{ type: 'WEEKDAY_SURCHARGE', mode: 'PERCENT', value: 20, amount: 1200 }]);
      expectFeeOnTop(q);
    });
  });

  it('VPR-04 the Saturday surcharge leaves a Monday at the plain rate', () => {
    quote(monday, 20).then((body) => {
      const q = body.data?.venuePriceQuote as Quote;
      expect(q).to.deep.include({ date: ymd(monday), base: 6000, rules_total: 0, venue_price: 6000 });
      expect(q.rules).to.deep.equal([]);
    });
  });

  it('VPR-05 a date override replaces every other rule for that one day', () => {
    const override = { type: 'DATE_OVERRIDE', dates: [ymd(saturday)], mode: 'FLAT', value: -1000 };
    const draft = { ...DRAFT, price_rules: [...DRAFT.price_rules, override] };
    quote(saturday, 20, draft).then((body) => {
      const q = body.data?.venuePriceQuote as Quote;
      expect(q.rules).to.deep.equal([{ type: 'DATE_OVERRIDE', mode: 'FLAT', value: -1000, amount: -1000 }]);
      expect(q).to.deep.include({ base: 6000, rules_total: -1000, venue_price: 5000 });
    });
    quote(new Date(saturday.getTime() + 7 * DAY_MS), 20, draft).then((body) => {
      const q = body.data?.venuePriceQuote as Quote;
      expect(q.rules.map((r) => r.type), 'the next Saturday keeps the weekday surcharge').to.deep.equal(['WEEKDAY_SURCHARGE']);
    });
  });

  it('VPR-06 guests outside the limits, a maximum below the minimum and overlapping slots are refused', () => {
    quote(saturday, 30, { ...DRAFT, max_pax: 25 }).then((body) =>
      expectRefused('venuePriceQuote', body, refusal('BAD_USER_INPUT', 'Guests must be between 1 and 25')),
    );
    cy.gqlRaw(SAVE, { id: venue.id, input: { ...DRAFT, min_pax: 10, max_pax: 5 } }, { token }).then((body) =>
      expectRefused('updateVenuePricing', body, refusal('BAD_USER_INPUT', 'Maximum guests must be at least the minimum')),
    );
    const slots = [
      { start_time: '10:00', end_time: '13:00', price: 2000, days_of_week: [SATURDAY] },
      { start_time: '12:00', end_time: '15:00', price: 2000, days_of_week: [SATURDAY] },
    ];
    quote(saturday, 20, { model: 'PER_SLOT', slots }).then((body) =>
      expectRefused('venuePriceQuote', body, refusal('BAD_USER_INPUT', 'Two slots overlap on the same day')),
    );
    cy.gql<{ venuePricing: Record<string, unknown> }>(READ, { id: venue.id }, { token }).then(({ venuePricing }) => {
      expect(asInput(venuePricing), 'nothing refused was saved').to.deep.equal(original);
    });
  });

  it('VPR-07 a saved pricing reads back as saved, and is what the venue is configured with', () => {
    cy.gql<{ updateVenuePricing: Record<string, unknown> }>(SAVE, { id: venue.id, input: DRAFT }, { token })
      .its('updateVenuePricing')
      .should('deep.equal', {
        model: 'PER_PAX',
        configured: true,
        base_rate: 300,
        min_pax: 1,
        price_rules: [{ type: 'WEEKDAY_SURCHARGE', mode: 'PERCENT', value: 20, days: [SATURDAY] }],
      });
    cy.gql<{ venuePricing: { model: string; base_rate: number; configured: boolean } }>(READ, { id: venue.id }, { token })
      .its('venuePricing')
      .should('deep.include', { model: 'PER_PAX', base_rate: 300, configured: true });
  });
});
