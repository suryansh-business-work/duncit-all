/**
 * A venue's Fees & Minimum Spend as a host weighs it (Venues list cards and
 * Venue Details), and the Create Pod seed for "Pick This Venue for Pod" —
 * shared by mWeb and the app so both say and do the same thing (rules 29 + 56).
 *
 * The terms come from the server's `venueHostTerms` query, which answers only
 * for an active host; an empty answer means the viewer sees neither the terms
 * nor the button.
 */
import { CREATE_POD_WHERE_STEP } from './create-pod-steps';
import { VENUE_MIN_BUSINESS_KEY, VENUE_OFFER_MODELS, venueMinSpendText, type VenueMinBusinessRow } from './venue-offer';

/** The search param mWeb's `/create-pod` reads the picked venue's id from. */
export const PICK_VENUE_PARAM = 'pick_venue';

/** One venue's terms, as `venueHostTerms` returns them (rupees). */
export interface VenueHostTerms {
  venue_id: string;
  min_guests: number;
  min_business: readonly VenueMinBusinessRow[];
  min_spend: number;
  cleaning_fee: number;
  pet_fee: number;
  deposit: number;
  gst_enabled: boolean;
}

/** One line of the terms, with a stable id for keys and test ids. */
export interface VenueHostTermLine {
  id: string;
  text: string;
}

type TermsTranslate = (key: string, opts?: { vars?: Record<string, string | number>; count?: number }) => string;

const positive = (value: number | null | undefined) => Math.max(0, Number(value) || 0);

/** What an offer to the venue must meet: its minimum spend, its amount per basis, its fewest guests. */
function minimumLines(terms: Readonly<VenueHostTerms>, t: TermsTranslate, money: (rupees: number) => string): VenueHostTermLine[] {
  const spend = venueMinSpendText(terms.min_spend, t, money);
  const lines: VenueHostTermLine[] = spend ? [{ id: 'minSpend', text: spend }] : [];
  for (const model of VENUE_OFFER_MODELS) {
    const row = terms.min_business.find((entry) => entry.model === model);
    if (row && row.amount > 0) {
      lines.push({ id: `minBusiness-${model}`, text: t(VENUE_MIN_BUSINESS_KEY[model].amount, { vars: { amount: money(row.amount) } }) });
    }
  }
  const guests = Math.floor(positive(terms.min_guests));
  if (guests > 0) lines.push({ id: 'minGuests', text: t('availability.hostTerms.minGuests', { count: guests }) });
  return lines;
}

/** What the venue adds to its price, and the deposit settled at the venue. */
function feeLines(terms: Readonly<VenueHostTerms>, t: TermsTranslate, money: (rupees: number) => string): VenueHostTermLine[] {
  const lines: VenueHostTermLine[] = [];
  if (positive(terms.cleaning_fee) > 0) {
    lines.push({ id: 'cleaningFee', text: t('availability.hostTerms.cleaningFee', { vars: { amount: money(terms.cleaning_fee) } }) });
  }
  if (positive(terms.pet_fee) > 0) {
    lines.push({ id: 'petFee', text: t('availability.hostTerms.petFee', { vars: { amount: money(terms.pet_fee) } }) });
  }
  if (positive(terms.deposit) > 0) {
    lines.push({ id: 'deposit', text: t('availability.hostTerms.deposit', { vars: { amount: money(terms.deposit) } }) });
  }
  if (terms.gst_enabled) lines.push({ id: 'gst', text: t('availability.hostTerms.gst') });
  return lines;
}

/**
 * The venue's terms as lines — the minimums an offer must meet, then the fees
 * added to its price. `compact` (a list card) keeps the minimums only. Empty
 * when the venue sets none. `money` is the surface's formatter.
 */
export function venueHostTermLines(
  terms: Readonly<VenueHostTerms> | null | undefined,
  t: TermsTranslate,
  money: (rupees: number) => string,
  options: { compact?: boolean } = {}
): VenueHostTermLine[] {
  if (!terms) return [];
  const minimums = minimumLines(terms, t, money);
  return options.compact ? minimums : [...minimums, ...feeLines(terms, t, money)];
}

/** Each venue's terms by its id, for a list of cards. */
export const venueHostTermsById = (rows: readonly VenueHostTerms[] | null | undefined): Map<string, VenueHostTerms> =>
  new Map((rows ?? []).map((row) => [row.venue_id, row]));

/** The picked venue, as Create Pod's venue list carries it. */
export interface PickedVenue {
  id: string;
  location_id?: string | null;
  locality?: string | null;
}

/** A city Create Pod offers, with its areas. */
export interface PickedVenueCity {
  id: string;
  location_zones?: ReadonlyArray<{ zone_name: string }> | null;
}

/** What "Pick This Venue for Pod" lays over a fresh form. */
export interface PickedVenueSeed {
  values: {
    pod_mode: 'PHYSICAL';
    venue_id: string;
    location_id?: string;
    locality?: string;
    host_category_key?: string;
  };
  /** Where & when when nothing is left to choose on What, else What. */
  step: number;
}

const sameArea = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The fresh Create Pod form for a picked venue: a physical pod at that venue,
 * in its city and (when the city names it) its area, so Where & when lists the
 * clubs around it. A host with one category has nothing left to choose on What
 * (`soleCategoryKey`), so the form opens on Where & when; otherwise on What.
 */
export function pickedVenueSeed(
  venue: Readonly<PickedVenue>,
  cities: readonly PickedVenueCity[],
  soleCategoryKey?: string | null
): PickedVenueSeed {
  const values: PickedVenueSeed['values'] = { pod_mode: 'PHYSICAL', venue_id: venue.id };
  const city = cities.find((item) => !!venue.location_id && item.id === venue.location_id);
  if (city) {
    values.location_id = city.id;
    const area = venue.locality ?? '';
    const zone = area ? (city.location_zones ?? []).find((item) => sameArea(item.zone_name, area)) : undefined;
    if (zone) values.locality = zone.zone_name;
  }
  if (soleCategoryKey) values.host_category_key = soleCategoryKey;
  return { values, step: soleCategoryKey ? CREATE_POD_WHERE_STEP : 0 };
}

/** Whether the form is still on the venue the host picked — what keeps Create Pod's shortcuts on. */
export const isPickedVenue = (pickedVenueId: string | null | undefined, venueId: string | null | undefined): boolean =>
  !!pickedVenueId && pickedVenueId === venueId;
