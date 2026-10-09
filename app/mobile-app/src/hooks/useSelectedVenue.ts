import { useEffect } from 'react';
import { pickVenue, type SwitchableVenue } from '@duncit/utils';

import { useSelectedVenueStore } from '@/stores/selected-venue.store';
import { fireAndForget } from '@/utils/fire-and-forget';

/**
 * Which of `venues` a Venue Studio screen is about — the one the owner last
 * picked on ANY venue screen, remembered across launches. A saved id that no
 * longer names one of their venues falls back through `pickVenue` (shared with
 * mWeb and the Partner console), so a deleted venue never strands a screen.
 */
export function useSelectedVenue<T extends SwitchableVenue>(venues: readonly T[]) {
  const stored = useSelectedVenueStore((s) => s.venueId);
  const status = useSelectedVenueStore((s) => s.status);
  const hydrate = useSelectedVenueStore((s) => s.hydrate);
  const selectVenue = useSelectedVenueStore((s) => s.select);

  useEffect(() => {
    if (status === 'idle') fireAndForget(hydrate());
  }, [status, hydrate]);

  const venue = pickVenue(venues, stored);
  return { venue, venueId: venue?.id ?? null, selectVenue };
}
