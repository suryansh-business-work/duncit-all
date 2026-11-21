import { makeOfferRules } from '../CreatePodStepper/offerRules';
import { makeCreatePodSchema } from '../create-pod.form';
import { blankCreatePodForm, type CreatePodFormValues, type CreatePodVenue } from '../create-pod.types';

/** Echoes the key and its values, so each assertion names the copy it expects. */
const t = (key: string, opts?: { vars?: Record<string, string | number> }) => (opts?.vars ? `${key}:${JSON.stringify(opts.vars)}` : key);

/** A venue taking 8 guests at least, ₹200 a guest and ₹5,000 a booking; its terrace holds 6. */
const venue = {
  id: 'v1',
  venue_name: 'Sky Deck',
  capacity: 40,
  capacity_items: [{ label: 'Terrace', capacity: 6 }],
  offer_min_guests: 8,
  offer_min_business: [{ model: 'PER_GUEST', amount: 200 }],
  offer_min_spend: 5000,
} as CreatePodVenue;

const values = (over: Partial<CreatePodFormValues> = {}): CreatePodFormValues => ({
  ...blankCreatePodForm,
  venue_id: 'v1',
  venue_space_label: 'Terrace',
  venue_offer_model: 'PER_GUEST',
  venue_offer_rate: '500',
  no_of_spots_text: '20',
  pod_date_time_text: '2027-01-04 18:00',
  pod_end_date_time_text: '2027-01-04 20:00',
  ...over,
});

describe('makeOfferRules', () => {
  const rules = makeOfferRules([venue], t);

  it("names the minimum spend shortfall at the venue's fewest guests, capped by the space", () => {
    // The terrace holds 6: ₹500 × 6 = ₹3,000 against ₹5,000.
    expect(rules.shortfall(values())).toBe(
      `availability.offers.minSpend.offerBelow:${JSON.stringify({ min: '₹5,000', offered: '₹3,000', shortfall: '₹2,000' })}`,
    );
  });

  it('weighs an hourly offer over the picked window, and passes once the offer reaches the minimum', () => {
    expect(rules.shortfall(values({ venue_offer_model: 'PER_HOUR', venue_offer_rate: '2000' }))).toContain('"shortfall":"₹1,000"');
    expect(rules.shortfall(values({ venue_offer_rate: '850' }))).toBeNull();
    expect(rules.shortfall(values({ venue_offer_model: 'FREE', venue_offer_rate: '' }))).toBeNull();
    expect(rules.shortfall(values({ venue_id: 'other' }))).toBeNull();
  });

  it("keeps the business floor on the offer's basis", () => {
    expect(rules.floor(values())).toMatchObject({ min: 200 });
    expect(rules.floor(values({ venue_offer_model: 'FLAT' }))).toBeNull();
  });
});

describe('Create Pod schema with the venue minimums', () => {
  const offer = makeOfferRules([venue], t);
  const schema = makeCreatePodSchema(t, null, offer.floor, null, offer.shortfall);
  const rateIssues = (v: CreatePodFormValues) =>
    (schema.safeParse(v).error?.issues ?? []).filter((issue) => issue.path[0] === 'venue_offer_rate').map((issue) => issue.message);

  it('holds an offer short of the minimum spend on the rate, and lets one that reaches it through', () => {
    expect(rateIssues(values())).toEqual([expect.stringContaining('availability.offers.minSpend.offerBelow')]);
    expect(rateIssues(values({ venue_offer_rate: '850' }))).toEqual([]);
  });

  it('names the business floor first when the rate is below it', () => {
    expect(rateIssues(values({ venue_offer_rate: '150' }))).toEqual([expect.stringContaining('availability.offers.minBusiness.offerBelow')]);
  });
});
