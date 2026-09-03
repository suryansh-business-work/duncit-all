import { useCallback, useEffect, useState } from 'react';
import type {
  AutoPodLocation,
  AutoPodMode,
  AutoPodRole,
  AutoPodRow,
  AutoPodStage,
} from '@duncit/utils';

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

/**
 * What narrows a role's queue: the city chosen in the header ('' = every city)
 * and, for a host, one of their approved sub-categories ('' = all of them).
 * A city narrows to offers pinned there PLUS every unpinned offer — an offer
 * nobody has enrolled in yet belongs to no city until somebody does.
 */
export interface AutoPodQueueScope {
  locationId?: string;
  subCategoryId?: string;
  /** Venue queue only: which of the owner's venues is looking. */
  venueId?: string;
}

/** The three list queries select identical fields, so one node type covers all. */
type AutoPodNode = MobileVenueAutoPodsQuery['venueAutoPods'][number];

/**
 * An optional GraphQL field arrives as `undefined`; the shared row declares the
 * same absence as `null`. Both mean "the venue named no end time".
 */
const venueClaimOf = (claim: AutoPodNode['venue_claim']): AutoPodRow['venue_claim'] =>
  claim ? { ...claim, pod_end_date_time: claim.pod_end_date_time ?? null } : null;

/** The pinned city, with `bound_by` re-read as the plain string union the
 * shared helpers declare (codegen emits it as a string enum, like `stage`). */
const locationOf = (location: AutoPodNode['location']): AutoPodLocation | null =>
  location
    ? { ...location, bound_by: String(location.bound_by) as AutoPodLocation['bound_by'] }
    : null;

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
  pod_mode: String(node.pod_mode) as AutoPodMode,
  expires_at: node.expires_at ?? null,
  withdraw_penalty_points: node.withdraw_penalty_points ?? null,
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
  location: locationOf(node.location),
});

/** An empty selection is "no narrowing" to the server, so '' travels as null. */
const orNull = (value: string | undefined) => value || null;

/** Each role reads its OWN queue; the server decides what a caller may see. */
async function fetchAutoPods(
  role: AutoPodRole,
  scope: AutoPodQueueScope,
): Promise<AutoPodQueueRow[]> {
  const location_id = orNull(scope.locationId);
  if (role === 'venue') {
    const res = await graphqlRequest(
      VenueAutoPodsDocument,
      { location_id, venue_id: orNull(scope.venueId) },
      { auth: true },
    );
    return res.venueAutoPods.map(toRow);
  }
  if (role === 'host') {
    const res = await graphqlRequest(
      HostAutoPodsDocument,
      { location_id, sub_category_id: orNull(scope.subCategoryId) },
      { auth: true },
    );
    return res.hostAutoPods.map(toRow);
  }
  const res = await graphqlRequest(ClubAdminAutoPodsDocument, { location_id }, { auth: true });
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
export function useAutoPods(role: AutoPodRole, scope: AutoPodQueueScope = {}) {
  const [rows, setRows] = useState<AutoPodQueueRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  // Read out here so a caller passing a fresh `{}` each render does not re-run
  // the effect: the two strings are what the query actually depends on.
  const { locationId = '', subCategoryId = '' } = scope;

  const load = useCallback(async () => {
    const next = await fetchAutoPods(role, { locationId, subCategoryId });
    setRows(next);
    setHasError(false);
  }, [role, locationId, subCategoryId]);

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
