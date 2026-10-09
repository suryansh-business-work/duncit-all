import { useCallback, useState } from 'react';
import { pickVenue, type SwitchableVenue } from '@duncit/utils';

/** Where the venue the owner picked is remembered between pages and visits. */
export const SELECTED_VENUE_KEY = 'mweb_selected_venue';

function readStoredVenueId(): string | null {
  try {
    return globalThis.localStorage.getItem(SELECTED_VENUE_KEY);
  } catch (error) {
    // Storage blocked (private mode, site data off): the pick simply is not
    // remembered, and every page falls back to `pickVenue`'s default.
    console.warn('[useSelectedVenue] could not read the remembered venue', error);
    return null;
  }
}

function storeVenueId(venueId: string): void {
  try {
    globalThis.localStorage.setItem(SELECTED_VENUE_KEY, venueId);
  } catch (error) {
    console.warn('[useSelectedVenue] could not remember the selected venue', error);
  }
}

export interface SelectedVenue<T extends SwitchableVenue> {
  /** The venue every venue page shows — null only while there is none. */
  venue: T | null;
  venueId: string | null;
  /** Picks a venue here AND for every venue page opened after this one. */
  selectVenue: (venueId: string) => void;
}

/**
 * The venue the Venue Options page selected, carried to every venue page.
 *
 * The pick is the shared `pickVenue` rule over the owner's list, so a stored id
 * that names a venue no longer in the list (deleted, another account on this
 * browser, or filtered out by the page) falls back to the default safely.
 */
export function useSelectedVenue<T extends SwitchableVenue>(venues: readonly T[]): SelectedVenue<T> {
  const [storedId, setStoredId] = useState<string | null>(readStoredVenueId);
  const venue = pickVenue(venues, storedId);
  const selectVenue = useCallback((venueId: string) => {
    storeVenueId(venueId);
    setStoredId(venueId);
  }, []);
  return { venue, venueId: venue?.id ?? null, selectVenue };
}
