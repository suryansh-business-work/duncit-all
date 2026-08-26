import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { followActionFor, followStatusFrom } from '@duncit/utils';

import { MobilePublicHostsDocument, MobilePublicVenuesDocument } from '@/graphql/hosts-venues';
import { runUserFollowAction } from '@/services/follow-user';
import { graphqlRequest } from '@/services/graphql.client';

type HostsData = ResultOf<typeof MobilePublicHostsDocument>;
type VenuesData = ResultOf<typeof MobilePublicVenuesDocument>;
export type PublicHost = HostsData['publicHosts'][number];
export type PublicVenue = VenuesData['publicVenues'][number];

/** Hosts & Venues discovery — RN port of mWeb's HostsVenuesPage data layer.
 * Loads both lists + the viewer's following ids and toggles follow on a host. */
export function useHostsVenues() {
  const [hostsData, setHostsData] = useState<HostsData | null>(null);
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const [pendingFollow, setPendingFollow] = useState<string | null>(null);

  const loadHosts = useCallback(async () => {
    const data = await graphqlRequest(MobilePublicHostsDocument, undefined, { auth: true });
    setHostsData(data);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadHosts(),
      graphqlRequest(MobilePublicVenuesDocument, undefined, { auth: true }).then(
        (d) => active && setVenues(d.publicVenues),
      ),
    ])
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [loadHosts]);

  const meId = hostsData?.me?.user_id ?? null;
  const followingIds = useMemo(
    () => new Set(hostsData?.me?.following_user_ids ?? []),
    [hostsData?.me?.following_user_ids],
  );
  // A host with a private profile sits in neither set until they answer — the
  // button must say Requested there, not fall back to Follow.
  const requestedIds = useMemo(
    () => new Set(hostsData?.me?.requested_user_ids ?? []),
    [hostsData?.me?.requested_user_ids],
  );
  const statusFor = useCallback(
    (userId: string) => followStatusFrom(followingIds, requestedIds, userId),
    [followingIds, requestedIds],
  );

  const toggleFollow = useCallback(
    async (userId: string) => {
      if (!userId || userId === meId) return;
      setPendingFollow(userId);
      try {
        await runUserFollowAction(followActionFor(statusFor(userId)), userId);
        await loadHosts();
      } finally {
        setPendingFollow(null);
      }
    },
    [statusFor, meId, loadHosts],
  );

  return {
    hosts: hostsData?.publicHosts ?? [],
    venues,
    meId,
    followingIds,
    statusFor,
    pendingFollow,
    isLoading,
    error,
    toggleFollow,
  };
}

/** A single approved venue by id (filtered from the public list) — mWeb's VenueDetailsPage. */
export function useVenueDetails(venueId: string) {
  const [venue, setVenue] = useState<PublicVenue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    graphqlRequest(MobilePublicVenuesDocument, undefined, { auth: true })
      .then((d) => active && setVenue(d.publicVenues.find((v) => v.id === venueId) ?? null))
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [venueId]);

  return { venue, isLoading, error };
}
