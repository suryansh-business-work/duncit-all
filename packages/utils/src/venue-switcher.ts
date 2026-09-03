/**
 * Which venue a Venue Studio is looking at.
 *
 * A partner with more than one venue had no way to change the one the studio
 * showed: mWeb read `myVenue` (the server's own pick) and the native screen
 * simply took the first row, so every figure on the page belonged to a venue
 * the owner never chose. The control is drawn in MUI on mWeb and Tamagui on
 * native, but WHICH venue it lands on — and whether it appears at all — is one
 * rule, and lives here so the two surfaces cannot disagree (rules 27 + 40).
 *
 * No user-facing word lives in this module: each app passes its own translated
 * fallback into `venueLabel`.
 */

/** The fields a switcher reads off a venue. Callers pass their fuller row. */
export interface SwitchableVenue {
  id: string;
  venue_name?: string | null;
  city?: string | null;
  status?: string | null;
}

/**
 * Statuses that mean an application is still in flight.
 *
 * The server's `myVenue` prefers the newest of these over an approved venue,
 * because an unfinished application is the thing the studio still has to nag
 * about. The default pick below mirrors that exactly, so turning the page into
 * a switcher does not quietly change the venue a one-venue owner lands on.
 */
export const VENUE_APPLICATION_STATUSES = new Set(['DRAFT', 'REJECTED', 'SUBMITTED']);

/** True once there is a second venue to switch to — below that it is noise. */
export function canSwitchVenues(venues: readonly SwitchableVenue[]): boolean {
  return venues.length > 1;
}

/**
 * The venue the studio shows: the selected one, or — when nothing is selected
 * yet or the saved id names a venue that is no longer there — the newest
 * in-flight application, else the newest venue. `myVenues` already answers
 * newest-first, so "first row" is "newest".
 */
export function pickVenue<T extends SwitchableVenue>(
  venues: readonly T[],
  selectedId: string | null | undefined
): T | null {
  const chosen = selectedId ? venues.find((venue) => venue.id === selectedId) : undefined;
  if (chosen) return chosen;
  const pending = venues.find((venue) => VENUE_APPLICATION_STATUSES.has(venue.status ?? ''));
  return pending ?? venues[0] ?? null;
}

/** The id `pickVenue` falls back to — what a screen seeds its selection with. */
export function defaultVenueId(venues: readonly SwitchableVenue[]): string | null {
  return pickVenue(venues, null)?.id ?? null;
}

/** The venue's name, or the caller's translated word for an unnamed draft. */
export function venueLabel(venue: SwitchableVenue | null | undefined, fallback: string): string {
  return venue?.venue_name?.trim() || fallback;
}

/** The line under the name in the switcher — `"Lucknow · APPROVED"`. */
export function venueSubLabel(venue: SwitchableVenue | null | undefined): string {
  return [venue?.city, venue?.status].filter(Boolean).join(' · ');
}
