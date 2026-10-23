import { localInstant, localParts } from '@modules/venues/venuePricing/venuePricing.time';
import { getAppTimeZone } from '@utils/app-time';

/** A window `days` ahead at `fromMinutes`–`toMinutes` of the venue's local day (in the app's time zone). */
export function windowOn(days: number, fromMinutes: number, toMinutes: number) {
  const zone = getAppTimeZone();
  const { ymd } = localParts(new Date(Date.now() + days * 86_400_000), zone);
  return {
    start_at: localInstant(ymd, fromMinutes, zone).toISOString(),
    end_at: localInstant(ymd, toMinutes, zone).toISOString(),
  };
}

/** A proposal inside a venue's default opening hours (09:00–23:00): 10:00–12:00, ten guests, a flat ₹2000. */
export function proposal(days = 3, over: Record<string, unknown> = {}) {
  return { ...windowOn(days, 10 * 60, 12 * 60), pax: 10, model: 'FLAT' as const, rate: 2000, ...over };
}
