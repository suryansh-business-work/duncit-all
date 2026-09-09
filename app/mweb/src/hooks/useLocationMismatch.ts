import { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { locationMismatch, type LocationMismatch } from '@duncit/utils';
import { useAppLocation } from '../app/AppLocationContext';
import { APPLY_LOCATION_EVENT, type ApplyLocationDetail } from '../components/app-header/queries';

/** The header already fetched every location with a wider selection than this
 * one, so Apollo answers it from the cache — no second round trip per page. */
const LOCATION_NAMES = gql`
  query LocationMismatchNames {
    locations {
      id
      location_name
    }
  }
`;

interface LocationNameRow {
  id: string;
  location_name: string;
}

interface LocationNamesData {
  locations: LocationNameRow[];
}

/** Where the opened pod, club or venue lives: its Location row + area. */
export interface LocationTarget {
  id?: string | null;
  zone?: string | null;
}

export interface LocationPrompt {
  /** What the dialog states; null when there is nothing to say or it was dismissed. */
  mismatch: LocationMismatch | null;
  /** Make the link's city the header's selection (the header persists it). */
  switchLocation: () => void;
  /** Stay where the viewer is; the page opens as it is. */
  keepLocation: () => void;
}

/**
 * Whether the page the viewer just opened is somewhere other than where they
 * are browsing, resolved to the two place names the dialog reads out.
 *
 * Pass null until the entity has loaded, or for one that has no place of its
 * own (a virtual pod). Dismissing is remembered per target, so the same pod
 * does not ask twice while the page is up, and a switch closes the dialog on
 * its own: once the header matches, there is no mismatch left to show.
 */
export function useLocationMismatch(target: LocationTarget | null): LocationPrompt {
  const { locationId, zoneName } = useAppLocation();
  const { data } = useQuery<LocationNamesData>(LOCATION_NAMES, {
    fetchPolicy: 'cache-first',
    skip: !target?.id,
  });
  const [dismissedFor, setDismissedFor] = useState('');

  const rows = data?.locations ?? [];
  const nameOf = (id?: string | null) => rows.find((row) => row.id === id)?.location_name;
  const found = target
    ? locationMismatch(
        { id: locationId, city: nameOf(locationId), zone: zoneName },
        { id: target.id, city: nameOf(target.id), zone: target.zone },
      )
    : null;
  const mismatch = found && dismissedFor !== found.targetId ? found : null;

  const switchLocation = () => {
    if (!found) return;
    const detail: ApplyLocationDetail = { locationId: found.targetId, zoneName: found.targetZone };
    globalThis.dispatchEvent(new CustomEvent(APPLY_LOCATION_EVENT, { detail }));
  };
  const keepLocation = () => setDismissedFor(found?.targetId ?? '');

  return { mismatch, switchLocation, keepLocation };
}
