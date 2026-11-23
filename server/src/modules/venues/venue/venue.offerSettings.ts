/**
 * A venue's own terms for booking offers (Partners / mWeb / app > Fees &
 * Minimum Spend): the fewest guests a host may offer for, how many hours either
 * side has to answer an offer or a counter before it expires, and the venue's
 * minimums. For the first two, 0 means "use the platform's default" (Admin
 * settings), so a venue that never opened the page still has both.
 *
 * Two minimums, both rules a host's terms must meet (`venueOffer.minimums`):
 * - the business amounts — the least the venue takes per guest, per hour or per
 *   booking, each held against an offer on that basis
 *   (`assertOfferMeetsMinBusiness`); a basis with no amount has no floor;
 * - the minimum spend — the least one booking's offer must come to: the rate
 *   times the fewest guests, times the hours, or the flat price
 *   (`assertOfferMeetsMinSpend`). It replaces the old silent top-up.
 * A free ask meets neither: the venue only accepts or declines it — and a host
 * may only make one to a venue that is open to free bookings for initiatives
 * (`free_booking`, off unless the venue turns it on; `assertVenueTakesFreeBookings`).
 */
import { GraphQLError } from 'graphql';
import { settingsService } from '@modules/platform/settings/settings.service';
import { FREE_OFFER_MODEL, MAX_OFFER_RATE, VENUE_OFFER_MODELS, type VenueOfferModel } from '@modules/venues/venueOffer/venueOffer.types';

/** Roughly what the venue hopes to earn on one pricing basis, in rupees. */
export interface IVenueMinBusiness {
  model: VenueOfferModel;
  amount: number;
}

export interface IVenueOfferSettings {
  /** Fewest guests per booking. 0 = the platform default. */
  min_guests: number;
  /** Hours to answer an offer or counter. 0 = the platform default. */
  response_hours: number;
  /** The least the venue takes, one per pricing basis. */
  min_business: IVenueMinBusiness[];
  /** The least one booking's offer must come to, in rupees. 0 = none. */
  min_spend: number;
  /** The venue is open to free bookings for initiatives: hosts may then ask for it free (offer model FREE). */
  free_booking: boolean;
}

export const VENUE_OFFER_SETTINGS_MAX = { minGuests: 1000, responseHours: 720 } as const;

const clampWhole = (value: unknown, max: number, fallback: number) => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : fallback;
};

const round2 = (rupees: number) => Math.round(rupees * 100) / 100;

const isModel = (model: unknown): model is VenueOfferModel => (VENUE_OFFER_MODELS as readonly unknown[]).includes(model);

/** Stored amounts as the API reads them: known bases only, in the pickers' order. */
const toMinBusinessPub = (rows?: ReadonlyArray<Partial<IVenueMinBusiness>> | null): IVenueMinBusiness[] =>
  VENUE_OFFER_MODELS.flatMap((model) => {
    const row = (rows ?? []).find((entry) => entry?.model === model);
    const amount = Number(row?.amount);
    return row && Number.isFinite(amount) && amount > 0 ? [{ model, amount: round2(amount) }] : [];
  });

/** A stored minimum spend as the API reads it: a positive amount, else 0 (none). */
const toMinSpendPub = (value: unknown): number => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? round2(amount) : 0;
};

/** The stored settings as the API reads them; missing fields read as 0 (the default / none) and no amounts. */
export const toOfferSettingsPub = (s?: Partial<IVenueOfferSettings> | null): IVenueOfferSettings => ({
  min_guests: clampWhole(s?.min_guests, VENUE_OFFER_SETTINGS_MAX.minGuests, 0),
  response_hours: clampWhole(s?.response_hours, VENUE_OFFER_SETTINGS_MAX.responseHours, 0),
  min_business: toMinBusinessPub(s?.min_business),
  min_spend: toMinSpendPub(s?.min_spend),
  // Only an explicit yes opens it: a venue that never saved the switch takes no free bookings.
  free_booking: s?.free_booking === true,
});

/**
 * A host may ask this venue for the window free only while it is open to free
 * bookings for initiatives (Fees & Minimum Spend), else FREE_BOOKING_OFF. The
 * terms the venue already holds are not touched: only a new ask is checked.
 * Client twin: `hostOfferModelsFor` in @duncit/utils.
 */
export function assertVenueTakesFreeBookings(offers: Partial<IVenueOfferSettings> | null | undefined): void {
  if (toOfferSettingsPub(offers).free_booking) return;
  throw new GraphQLError('This venue does not take free bookings — offer it a price instead', {
    extensions: { code: 'BAD_USER_INPUT', reason: 'FREE_BOOKING_OFF', field: 'venue_offer_model' },
  });
}

const refuse = (message: string, field = 'min_business') =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT', field } });

/**
 * A host's terms meet the venue's amount on the basis they pay on, or
 * BELOW_MIN_BUSINESS. A basis with no amount, and a free ask, pass. Client twin:
 * `venueOfferFloor` in @duncit/utils.
 */
export function assertOfferMeetsMinBusiness(
  rows: ReadonlyArray<Partial<IVenueMinBusiness>> | null | undefined,
  model: unknown,
  rate: unknown
): void {
  if (!isModel(model)) return;
  const floor = toMinBusinessPub(rows).find((row) => row.model === model);
  if (!floor) return;
  const offered = Number(rate);
  if (Number.isFinite(offered) && offered >= floor.amount) return;
  throw new GraphQLError(`This venue takes offers of at least ${floor.amount} on this basis — raise your offer`, {
    extensions: { code: 'BAD_USER_INPUT', reason: 'BELOW_MIN_BUSINESS', field: 'venue_offer_rate', min: floor.amount, model },
  });
}

/**
 * A host's terms come to at least the venue's minimum spend, or
 * BELOW_MIN_SPEND with the minimum, what the offer comes to and the shortfall.
 * `offered` is the offer's own amount at the fewest guests — the price
 * calculation's `base`, before the venue's rules, fees and GST. No minimum, and
 * a free ask, pass. Client twin: `offerMinSpendShortfall` in @duncit/utils.
 */
export function assertOfferMeetsMinSpend(minSpend: unknown, model: unknown, offered: number): void {
  const min = toMinSpendPub(minSpend);
  if (!isModel(model) || min === 0) return;
  const amount = round2(Math.max(0, Number(offered) || 0));
  if (amount >= min) return;
  const shortfall = round2(min - amount);
  throw new GraphQLError(
    `This venue's minimum spend is ${min} per booking — your offer comes to ${amount}, ${shortfall} short. Raise your offer`,
    { extensions: { code: 'BAD_USER_INPUT', reason: 'BELOW_MIN_SPEND', field: 'venue_offer_rate', min, offered: amount, shortfall } }
  );
}

/** How a booking pays the venue and how big it is — what its minimum reads. */
export interface BookingShape {
  /** The basis the venue is paid on; null/unknown = only the minimum spend applies. */
  model?: string | null;
  /** People at the venue — the pod's spots, the host's seat included. */
  guests: number;
  /** Hours the venue is booked for. */
  hours: number;
}

/**
 * The least one booking must bring this venue, in rupees: the larger of its
 * minimum spend and the business amount for the way the booking pays — per
 * guest × the guests, per hour × the hours, or the per-booking amount. A basis
 * with no amount, an unknown basis and a free ask add nothing; 0 = no minimum.
 *
 * The same two settings the host's offer is held to (Partners > Fees & Minimum
 * Spend), stated as one booking total so a pod's ticket money can be held to it
 * too (podViability: ticket money − Duncit's commission must be MORE).
 */
export function venueBookingMinimum(
  offers: Partial<IVenueOfferSettings> | null | undefined,
  shape: BookingShape
): number {
  if (shape.model === FREE_OFFER_MODEL) return 0;
  const pub = toOfferSettingsPub(offers);
  const row = isModel(shape.model) ? pub.min_business.find((entry) => entry.model === shape.model) : undefined;
  let basisTotal = 0;
  if (row?.model === 'FLAT') basisTotal = row.amount;
  else if (row?.model === 'PER_GUEST') basisTotal = row.amount * Math.max(0, Math.floor(shape.guests) || 0);
  else if (row?.model === 'PER_HOUR') basisTotal = row.amount * Math.max(0, Number(shape.hours) || 0);
  return round2(Math.max(pub.min_spend, basisTotal));
}

/**
 * The business amounts an owner (or staff) sends: at least one, one per pricing
 * basis, each a positive amount within an offer's bound.
 */
export function cleanMinBusiness(raw: unknown): IVenueMinBusiness[] {
  if (!Array.isArray(raw) || raw.length === 0) throw refuse('Add the business you expect from at least one booking type');
  const seen = new Set<VenueOfferModel>();
  for (const row of raw as Array<{ model?: unknown; amount?: unknown }>) {
    if (!isModel(row?.model)) throw refuse('Pick per guest, per hour or per booking for each amount');
    if (seen.has(row.model)) throw refuse('Each booking type can be listed once');
    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw refuse('Enter an amount above 0 for each booking type');
    if (amount > MAX_OFFER_RATE) throw refuse('This amount is too large');
    seen.add(row.model);
  }
  return toMinBusinessPub(raw as IVenueMinBusiness[]);
}

/** The minimum spend an owner (or staff) sends: 0 (none) or a positive amount within an offer's bound. */
export function cleanMinSpend(raw: unknown): number {
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) throw refuse('Enter a minimum spend of 0 or more', 'min_spend');
  if (amount > MAX_OFFER_RATE) throw refuse('This amount is too large', 'min_spend');
  return toMinSpendPub(amount);
}

const given = (value: unknown) => value !== undefined && value !== null;

/** An owner's (or staff) edit, laid over what is stored. Out-of-range numbers are clamped; amounts are checked. */
export function normalizeOfferSettingsInput(
  base: IVenueOfferSettings,
  input: Partial<Record<keyof IVenueOfferSettings, unknown>>
): IVenueOfferSettings {
  return {
    min_guests: given(input.min_guests)
      ? clampWhole(input.min_guests, VENUE_OFFER_SETTINGS_MAX.minGuests, base.min_guests)
      : base.min_guests,
    response_hours: given(input.response_hours)
      ? clampWhole(input.response_hours, VENUE_OFFER_SETTINGS_MAX.responseHours, base.response_hours)
      : base.response_hours,
    // Left out (an app from before these fields): they stay as they are.
    min_business: given(input.min_business) ? cleanMinBusiness(input.min_business) : base.min_business,
    min_spend: given(input.min_spend) ? cleanMinSpend(input.min_spend) : base.min_spend,
    free_booking: given(input.free_booking) ? cleanFreeBooking(input.free_booking) : base.free_booking,
  };
}

/** The free-bookings switch an owner (or staff) sends: a true/false, nothing else. */
export function cleanFreeBooking(raw: unknown): boolean {
  if (typeof raw !== 'boolean') throw refuse('Turn free bookings on or off', 'free_booking');
  return raw;
}

export interface VenueOfferDefaults {
  min_guests: number;
  response_hours: number;
}

/** The venue's own values, falling back to the platform's for any left at 0. */
export function effectiveOfferSettings(
  own: Partial<IVenueOfferSettings> | null | undefined,
  defaults: VenueOfferDefaults
): VenueOfferDefaults {
  const pub = toOfferSettingsPub(own);
  return {
    min_guests: pub.min_guests || defaults.min_guests,
    response_hours: pub.response_hours || defaults.response_hours,
  };
}

/** The venue's effective offer terms, reading the platform defaults once. */
export async function venueOfferSettingsOf(venue: {
  settings?: { offers?: Partial<IVenueOfferSettings> | null } | null;
}): Promise<VenueOfferDefaults> {
  return effectiveOfferSettings(venue.settings?.offers, await settingsService.getVenueOfferDefaults());
}

const defaultsByRequest = new WeakMap<object, Promise<VenueOfferDefaults>>();

/**
 * The platform defaults, read once per GraphQL request — keyed on the request's
 * own context object: a list of venues asks for them per row, and the settings
 * document is the same for all of them.
 */
export function requestOfferDefaults(ctx: object): Promise<VenueOfferDefaults> {
  let defaults = defaultsByRequest.get(ctx);
  if (!defaults) {
    defaults = settingsService.getVenueOfferDefaults();
    defaultsByRequest.set(ctx, defaults);
  }
  return defaults;
}
