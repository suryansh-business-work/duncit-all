import { useCallback, useState } from 'react';
import { pickVenue, type SwitchableVenue } from '@duncit/utils';

/** Where the venue a partner last picked is remembered, per browser. */
export const SELECTED_VENUE_KEY = 'partners_selected_venue';

/** The "every venue" choice of the pages that can show all venues at once. */
export const ALL_VENUES = 'ALL';

function readStored(): string | null {
  try {
    return globalThis.localStorage?.getItem(SELECTED_VENUE_KEY) ?? null;
  } catch (error) {
    // Storage blocked (private window, disabled site data): the pick falls back
    // to the default venue — remembering it is a convenience, never required.
    console.warn('[useSelectedVenue] could not read the remembered venue', error);
    return null;
  }
}

function writeStored(venueId: string) {
  try {
    globalThis.localStorage?.setItem(SELECTED_VENUE_KEY, venueId);
  } catch (error) {
    console.warn('[useSelectedVenue] could not remember the venue', error);
  }
}

export interface SelectedVenue<T extends SwitchableVenue> {
  venue: T | null;
  venueId: string | null;
  selectVenue: (venueId: string) => void;
}

/**
 * The venue every Venue Studio page opens on: the one the partner picked last
 * (on any venue page), or — with nothing picked, or a stored id that names a
 * venue no longer theirs — the shared default (`pickVenue`).
 */
export function useSelectedVenue<T extends SwitchableVenue>(venues: readonly T[]): SelectedVenue<T> {
  const [stored, setStored] = useState<string | null>(readStored);
  const venue = pickVenue(venues, stored);
  const selectVenue = useCallback((venueId: string) => {
    setStored(venueId);
    writeStored(venueId);
  }, []);
  return { venue, venueId: venue?.id ?? null, selectVenue };
}

export interface VenueFilter {
  /** The select's value: a venue id, or `ALL_VENUES`. */
  value: string;
  /** What a `venue_id` query variable takes: the id, or `null` for every venue. */
  venueIdOrNull: string | null;
  change: (value: string) => void;
}

/**
 * For the pages that also offer "All venues": they OPEN on the selected venue,
 * and picking a single venue there selects it everywhere. Choosing "All" is
 * this page's view only — it never overwrites the remembered venue.
 */
export function useVenueFilter(venues: readonly SwitchableVenue[]): VenueFilter {
  const { venueId, selectVenue } = useSelectedVenue(venues);
  const [all, setAll] = useState(false);
  const value = all || !venueId ? ALL_VENUES : venueId;
  const change = useCallback(
    (next: string) => {
      setAll(next === ALL_VENUES);
      if (next !== ALL_VENUES) selectVenue(next);
    },
    [selectVenue],
  );
  return { value, venueIdOrNull: value === ALL_VENUES ? null : value, change };
}
