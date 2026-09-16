import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { buildOfficialStatusSlides } from '@duncit/utils';
import { useAppLocation } from '../../app/AppLocationContext';
import { buildOfficialEntry, type HomeStatusEntry } from './homeStatusItems';
import { OFFICIAL_STATUSES, RECORD_OFFICIAL_STATUS_VIEW } from './queries';

export interface OfficialStatusRail {
  /** The pinned Duncit tile + the story it opens; null when nothing is live. */
  entry: HomeStatusEntry | null;
  /** Marks one Duncit slide watched — the same moment a story view is recorded. */
  recordView: (statusId: string) => void;
}

/**
 * The Duncit statuses for the city the viewer has SELECTED in the header, which
 * is not the same thing as their profile city. Read fresh every time: the row
 * carries `seen_by_me`, and a status the team just published has to appear on
 * the next home load rather than whenever a cache happens to turn over.
 */
export function useOfficialStatuses(name: string, tileLabel: string): OfficialStatusRail {
  const { locationId } = useAppLocation();
  const { data } = useQuery<any>(OFFICIAL_STATUSES, {
    variables: { locationId: locationId || undefined },
    fetchPolicy: 'network-only',
  });
  const [recordOfficialView] = useMutation<any>(RECORD_OFFICIAL_STATUS_VIEW);
  // The slides watched in THIS session. `recordOfficialStatusView` answers a
  // bare Boolean, so nothing writes `seen_by_me` back — without this the ring
  // would stay lit until the next fetch. Held here rather than in the rail so
  // the native twin's hook is the only other place the rule lives (rule 27).
  const [watched, setWatched] = useState<ReadonlySet<string>>(() => new Set());

  const entry = useMemo(() => {
    const slides = buildOfficialStatusSlides(data?.officialStatuses).map((slide) => ({
      ...slide,
      seen: slide.seen || watched.has(slide.id),
    }));
    return buildOfficialEntry(slides, name, tileLabel);
  }, [data?.officialStatuses, watched, name, tileLabel]);

  const recordView = useCallback(
    (statusId: string) => {
      setWatched((seen) => (seen.has(statusId) ? seen : new Set(seen).add(statusId)));
      recordOfficialView({ variables: { id: statusId } }).catch(() => undefined);
    },
    [recordOfficialView],
  );

  return { entry, recordView };
}
