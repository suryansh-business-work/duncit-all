import { useCallback, useMemo, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { PartnerRequestDirection, PartnerSide } from '@/generated/graphql/graphql';
import {
  NearbyVenuesForHostDocument,
  PodRequestHostCategoriesDocument,
} from '@/graphql/pod-requests';
import { useNearbyPartners, type NearbyItem } from '@/hooks/useNearbyPartners';
import { useNearbySearch } from '@/hooks/useNearbySearch';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

type VenueRow = ResultOf<typeof NearbyVenuesForHostDocument>['nearbyVenuesForHost'][number];

const toItem = (venue: VenueRow): NearbyItem => ({
  id: venue.id,
  kind: 'VENUE',
  name: venue.venue_name,
  imageUrl: venue.cover_image_url,
  category: venue.category,
  place: [venue.locality, venue.city].filter(Boolean).join(', '),
  distanceKm: venue.distance_km,
  openStatus: venue.open_request_status ?? null,
});

/**
 * Host Studio → Search Nearby Venues: approved venues around the picked
 * location, filtered to the host's own categories to start. "Request Pod"
 * sends a HOST_TO_VENUE request.
 */
export function useNearbyVenues() {
  const { t } = useTranslation();
  const [hostCategories, setHostCategories] = useState<string[] | null>(null);
  const [hostError, setHostError] = useState<string | null>(null);

  const loadHost = useCallback(async () => {
    const res = await graphqlRequest(PodRequestHostCategoriesDocument, undefined, { auth: true });
    const ids = (res.myHost?.host_categories ?? []).map((row) => row.category_id ?? '');
    setHostCategories([...new Set(ids.filter(Boolean))]);
  }, []);
  const hostQuery = useReloadableQuery(loadHost, {
    onError: (err) => setHostError(toErrorMessage(err, t('mweb.account.somethingWentWrong'))),
  });

  const defaults = useMemo(() => hostCategories ?? [], [hostCategories]);
  const state = useNearbySearch(defaults);
  const { search } = state;

  const fetchItems = useCallback(async () => {
    const res = await graphqlRequest(NearbyVenuesForHostDocument, { search }, { auth: true });
    return res.nearbyVenuesForHost.map(toItem);
  }, [search]);
  // Waits for the host's categories so the first search already carries them.
  const partners = useNearbyPartners(
    fetchItems,
    !!state.locationId && hostCategories !== null,
    PartnerSide.Host,
    null,
  );

  return {
    state,
    hostLoading: hostQuery.isLoading,
    hostError,
    partners,
    send: (item: NearbyItem, note: string) =>
      partners.send({
        direction: PartnerRequestDirection.HostToVenue,
        venue_id: item.id,
        note: note || null,
      }),
  };
}
