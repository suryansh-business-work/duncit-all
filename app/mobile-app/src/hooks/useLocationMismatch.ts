import { useState } from 'react';
import { locationMismatch, type LocationMismatch } from '@duncit/utils';

import { useLocations } from '@/hooks/useLocations';

/** Where the opened pod, club or venue lives: its Location row + area. */
export interface LocationTarget {
  id?: string | null;
  zone?: string | null;
}

export interface LocationPrompt {
  /** What the dialog states; null when there is nothing to say or it was dismissed. */
  mismatch: LocationMismatch | null;
  /** Make the link's city the header's selection (the store persists it). */
  switchLocation: () => void;
  /** Stay where the viewer is; the screen opens as it is. */
  keepLocation: () => void;
}

/**
 * Whether the screen the viewer just opened is somewhere other than where they
 * are browsing, resolved to the two place names the dialog reads out. RN twin
 * of mWeb's useLocationMismatch, on the same @duncit/utils rule.
 *
 * Pass null until the entity has loaded, or for one that has no place of its
 * own (a virtual pod). Dismissing is remembered per target, so the same pod
 * does not ask twice while the screen is up, and a switch closes the dialog on
 * its own: once the header matches, there is no mismatch left to show.
 */
export function useLocationMismatch(target: LocationTarget | null): LocationPrompt {
  const { locations, selectedId, cityLabel, zoneName, select } = useLocations();
  const [dismissedFor, setDismissedFor] = useState('');

  const targetLoc = target ? locations.find((l) => l.id === target.id) : undefined;
  const found = targetLoc
    ? locationMismatch(
        { id: selectedId, city: cityLabel, zone: zoneName },
        // The same name the header would show for it once selected.
        { id: targetLoc.id, city: targetLoc.city || targetLoc.location_name, zone: target?.zone },
      )
    : null;
  const mismatch = found && dismissedFor !== found.targetId ? found : null;

  const switchLocation = () => {
    if (found && targetLoc) select(targetLoc, found.targetZone);
  };
  const keepLocation = () => setDismissedFor(found?.targetId ?? '');

  return { mismatch, switchLocation, keepLocation };
}
