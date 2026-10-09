import { useCallback, useMemo, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { PartnerRequestDirection, PartnerSide } from '@/generated/graphql/graphql';
import {
  NearbyHostsForVenueDocument,
  PodRequestSearchVenuesDocument,
} from '@/graphql/pod-requests';
import { useNearbyPartners, type NearbyItem } from '@/hooks/useNearbyPartners';
import { useNearbySearch } from '@/hooks/useNearbySearch';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useSelectedVenue } from '@/hooks/useSelectedVenue';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

type SearchVenue = ResultOf<typeof PodRequestSearchVenuesDocument>['myVenues'][number];
type HostRow = ResultOf<typeof NearbyHostsForVenueDocument>['nearbyHostsForVenue'][number];

const toItem = (host: HostRow): NearbyItem => ({
  id: host.user_id,
  kind: 'HOST',
  name: host.name,
  imageUrl: host.photo_url,
  category: host.categories.join(' · '),
  place: '',
  distanceKm: host.distance_km,
  openStatus: host.open_request_status ?? null,
});

/**
 * Venue Studio → Search Nearby Hosts: approved hosts around the picked
 * location, for one of the owner's approved venues, filtered to the venue's
 * category to start. "Request Pod" sends a VENUE_TO_HOST request.
 */
export function useNearbyHosts() {
  const { t } = useTranslation();
  const [venues, setVenues] = useState<SearchVenue[]>([]);
  const [venuesError, setVenuesError] = useState<string | null>(null);

  const loadVenues = useCallback(async () => {
    const res = await graphqlRequest(PodRequestSearchVenuesDocument, undefined, { auth: true });
    setVenues(res.myVenues.filter((row) => row.status === 'APPROVED'));
  }, []);
  const venuesQuery = useReloadableQuery(loadVenues, {
    onError: (err) => setVenuesError(toErrorMessage(err, t('mweb.account.somethingWentWrong'))),
  });

  // Opens on the venue picked on any Venue Studio screen.
  const { venue, selectVenue } = useSelectedVenue(venues);
  const venueId = venue?.id ?? '';
  const venueCategory = venue?.venue_category.category_id ?? '';
  const defaults = useMemo(() => (venueCategory ? [venueCategory] : []), [venueCategory]);
  const state = useNearbySearch(defaults);
  const { search } = state;

  const fetchItems = useCallback(async () => {
    const res = await graphqlRequest(
      NearbyHostsForVenueDocument,
      { venue_id: venueId, search },
      { auth: true },
    );
    return res.nearbyHostsForVenue.map(toItem);
  }, [venueId, search]);
  const partners = useNearbyPartners(
    fetchItems,
    !!venueId && !!state.locationId,
    PartnerSide.Venue,
    venueId || null,
  );

  return {
    state,
    venues,
    venue,
    venuesLoading: venuesQuery.isLoading,
    venuesError,
    selectVenue: (id: string) => {
      selectVenue(id);
      state.resetCategories();
    },
    partners,
    send: (item: NearbyItem, note: string) =>
      partners.send({
        direction: PartnerRequestDirection.VenueToHost,
        venue_id: venueId,
        host_user_id: item.id,
        note: note || null,
      }),
  };
}
