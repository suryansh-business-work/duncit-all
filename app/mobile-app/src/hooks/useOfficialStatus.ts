import { useCallback, useEffect, useRef, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  OfficialStatusesDocument,
  RecordOfficialStatusViewDocument,
} from '@/graphql/official-status';
import { graphqlRequest } from '@/services/graphql.client';
import { useRefreshRegistration } from '@/components/PullToRefresh';
import { useLocationStore } from '@/stores/location.store';

/** One Duncit status as the rail reads it (the public projection). */
export type OfficialStatus = ResultOf<typeof OfficialStatusesDocument>['officialStatuses'][number];

/**
 * The live Duncit statuses for the city the viewer has SELECTED, plus the ids
 * watched in this session.
 *
 * Asked for fresh on every mount and whenever the selected city changes — the
 * answer carries `seen_by_me`, which is the ring's state, so a shared or cached
 * answer would show one viewer's rings to another. A failure leaves the list
 * empty: the pinned tile simply does not render, exactly like an ad slot.
 */
export function useOfficialStatus() {
  const locationId = useLocationStore((s) => s.selectedId);
  const [statuses, setStatuses] = useState<OfficialStatus[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set<string>());
  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt((value) => value + 1), []);
  // Ids already sent, so re-showing a slide never re-posts the view.
  const recorded = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    graphqlRequest(OfficialStatusesDocument, { locationId: locationId || null }, { auth: true })
      .then((data) => {
        if (active) setStatuses(data.officialStatuses);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [locationId, attempt]);

  useRefreshRegistration(refetch);

  /** Watched: grey the ring at once, then tell the server (idempotent there). */
  const recordView = useCallback((id: string) => {
    if (recorded.current.has(id)) return;
    recorded.current.add(id);
    setSeenIds((previous) => new Set(previous).add(id));
    graphqlRequest(RecordOfficialStatusViewDocument, { id }, { auth: true }).catch(() => undefined);
  }, []);

  return { statuses, seenIds, recordView };
}
