/**
 * A venue's own terms for booking offers (Partners > Venue settings > Booking
 * offers): the fewest guests a host may offer for, how many hours either side
 * has to answer an offer or a counter before it expires, and the business it
 * hopes each booking brings. For the first two, 0 means "use the platform's
 * default" (Admin settings), so a venue that never opened the page still has
 * both.
 *
 * The business amounts are a guide, never a rule: each says roughly what the
 * venue hopes to earn per guest, per hour or per booking, and Create Pod shows
 * them once the venue is picked. Nothing refuses an offer below them.
 */
import { GraphQLError } from 'graphql';
import { settingsService } from '@modules/platform/settings/settings.service';
import { MAX_OFFER_RATE, VENUE_OFFER_MODELS, type VenueOfferModel } from '@modules/venues/venueOffer/venueOffer.types';

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
  /** The business the venue hopes for, one per pricing basis. A guide only. */
  min_business: IVenueMinBusiness[];
}

export const VENUE_OFFER_SETTINGS_MAX = { minGuests: 1000, responseHours: 720 } as const;

const clampWhole = (value: unknown, max: number, fallback: number) => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : fallback;
};

const isModel = (model: unknown): model is VenueOfferModel => (VENUE_OFFER_MODELS as readonly unknown[]).includes(model);

/** Stored amounts as the API reads them: known bases only, in the pickers' order. */
const toMinBusinessPub = (rows?: ReadonlyArray<Partial<IVenueMinBusiness>> | null): IVenueMinBusiness[] =>
  VENUE_OFFER_MODELS.flatMap((model) => {
    const row = (rows ?? []).find((entry) => entry?.model === model);
    const amount = Number(row?.amount);
    return row && Number.isFinite(amount) && amount > 0 ? [{ model, amount: Math.round(amount * 100) / 100 }] : [];
  });

/** The stored settings as the API reads them; missing fields read as 0 (the default) and no amounts. */
export const toOfferSettingsPub = (s?: Partial<IVenueOfferSettings> | null): IVenueOfferSettings => ({
  min_guests: clampWhole(s?.min_guests, VENUE_OFFER_SETTINGS_MAX.minGuests, 0),
  response_hours: clampWhole(s?.response_hours, VENUE_OFFER_SETTINGS_MAX.responseHours, 0),
  min_business: toMinBusinessPub(s?.min_business),
});

const refuse = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT', field: 'min_business' } });

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

/** An owner's (or staff) edit, laid over what is stored. Out-of-range numbers are clamped; amounts are checked. */
export function normalizeOfferSettingsInput(
  base: IVenueOfferSettings,
  input: Partial<Record<keyof IVenueOfferSettings, unknown>>
): IVenueOfferSettings {
  return {
    min_guests:
      input.min_guests === undefined || input.min_guests === null
        ? base.min_guests
        : clampWhole(input.min_guests, VENUE_OFFER_SETTINGS_MAX.minGuests, base.min_guests),
    response_hours:
      input.response_hours === undefined || input.response_hours === null
        ? base.response_hours
        : clampWhole(input.response_hours, VENUE_OFFER_SETTINGS_MAX.responseHours, base.response_hours),
    // Left out (an app from before the amounts): they stay as they are.
    min_business:
      input.min_business === undefined || input.min_business === null ? base.min_business : cleanMinBusiness(input.min_business),
  };
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
