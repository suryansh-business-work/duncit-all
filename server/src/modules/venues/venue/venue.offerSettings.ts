/**
 * A venue's own terms for booking offers (Partners > Venue settings > Booking
 * offers): the fewest guests a host may offer for, and how many hours either
 * side has to answer an offer or a counter before it expires. 0 means "use the
 * platform's default" (Admin settings), so a venue that never opened the page
 * still has both.
 */
import { settingsService } from '@modules/platform/settings/settings.service';

export interface IVenueOfferSettings {
  /** Fewest guests per booking. 0 = the platform default. */
  min_guests: number;
  /** Hours to answer an offer or counter. 0 = the platform default. */
  response_hours: number;
}

export const VENUE_OFFER_SETTINGS_MAX = { minGuests: 1000, responseHours: 720 } as const;

const clampWhole = (value: unknown, max: number, fallback: number) => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : fallback;
};

/** The stored settings as the API reads them; missing fields read as 0 (the default). */
export const toOfferSettingsPub = (s?: Partial<IVenueOfferSettings> | null): IVenueOfferSettings => ({
  min_guests: clampWhole(s?.min_guests, VENUE_OFFER_SETTINGS_MAX.minGuests, 0),
  response_hours: clampWhole(s?.response_hours, VENUE_OFFER_SETTINGS_MAX.responseHours, 0),
});

/** An owner's (or staff) edit, laid over what is stored. Out-of-range values are clamped. */
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
