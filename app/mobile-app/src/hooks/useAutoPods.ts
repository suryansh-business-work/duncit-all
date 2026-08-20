import { useCallback, useEffect, useState } from 'react';
import type { AutoPodRole, AutoPodRow, AutoPodStage } from '@duncit/utils';

import {
  ClubAdminAutoPodsDocument,
  HostAutoPodsDocument,
  VenueAutoPodsDocument,
} from '@/graphql/auto-pods';
import type { MobileVenueAutoPodsQuery } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';

/**
 * A queue row plus the category the club picker filters on. `AutoPodRow` is the
 * shape every surface's shared helpers read; `sub_category_id` is native's own
 * addition, because the club sheet needs something to match a club against.
 */
export interface AutoPodQueueRow extends AutoPodRow {
  sub_category_id: string;
}

/** The three list queries select identical fields, so one node type covers all. */
type AutoPodNode = MobileVenueAutoPodsQuery['venueAutoPods'][number];

/**
 * An optional GraphQL field arrives as `undefined`; the shared row declares the
 * same absence as `null`. Both mean "the venue named no end time".
 */
const venueClaimOf = (claim: AutoPodNode['venue_claim']): AutoPodRow['venue_claim'] =>
  claim ? { ...claim, pod_end_date_time: claim.pod_end_date_time ?? null } : null;

/**
 * Codegen emits `stage` and media `type` as TypeScript string ENUMS, while the
 * shared helpers in `@duncit/utils` speak plain string unions — and a string
 * enum member is deliberately not assignable to its own literal type. The
 * runtime value is already the correct string, so this re-reads it as one
 * rather than asserting through `unknown`.
 */
const toRow = (node: AutoPodNode): AutoPodQueueRow => ({
  ...node,
  stage: String(node.stage) as AutoPodStage,
  pod_images_and_videos: node.pod_images_and_videos.map((media) => ({
    url: media.url,
    type: String(media.type),
  })),
  // Codegen types an absent claim as `undefined`, the shared row as `null`.
  // Both mean "has not enrolled", and `autoPodTicks` reads them as booleans —
  // but the types must agree, and `null` is the one the helpers declare.
  venue_claim: venueClaimOf(node.venue_claim),
  host_claim: node.host_claim ?? null,
  club_claim: node.club_claim ?? null,
});

/** Each role reads its OWN queue; the server decides what a caller may see. */
async function fetchAutoPods(role: AutoPodRole): Promise<AutoPodQueueRow[]> {
  if (role === 'venue') {
    const res = await graphqlRequest(VenueAutoPodsDocument, undefined, { auth: true });
    return res.venueAutoPods.map(toRow);
  }
  if (role === 'host') {
    const res = await graphqlRequest(HostAutoPodsDocument, undefined, { auth: true });
    return res.hostAutoPods.map(toRow);
  }
  const res = await graphqlRequest(ClubAdminAutoPodsDocument, undefined, { auth: true });
  return res.clubAdminAutoPods.map(toRow);
}

/**
 * One role's Auto Pod queue, as state.
 *
 * The Tamagui counterpart of the Apollo `useQuery` the MUI surfaces run (rule
 * 27). Everything either of them DECIDES — which rows are actionable, which the
 * viewer already took, who a row waits on — comes from the shared
 * `@duncit/utils` helpers, so only the fetching differs.
 *
 * `refetch` is what every sheet calls once its mutation lands: a claim races
 * against other partners, so the queue is re-read from the server rather than
 * patched locally.
 */
export function useAutoPods(role: AutoPodRole) {
  const [rows, setRows] = useState<AutoPodQueueRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    const next = await fetchAutoPods(role);
    setRows(next);
    setHasError(false);
  }, [role]);

  const refetch = useCallback(() => {
    load().catch(() => setHasError(true));
  }, [load]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    load()
      .catch(() => active && setHasError(true))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [load]);

  return { rows, isLoading, hasError, refetch };
}
