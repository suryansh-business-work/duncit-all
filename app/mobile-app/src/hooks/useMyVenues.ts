import { useCallback, useState } from 'react';
import type { SwitchableVenue } from '@duncit/utils';

import { VenueDashboardDocument } from '@/graphql/studio-dashboard';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useSelectedVenue } from '@/hooks/useSelectedVenue';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import type { DashboardVenue } from '@/hooks/useStudioDashboards';

/**
 * The owner's venues and the one the Venue Studio screens are about — the
 * persisted pick (`useSelectedVenue`). For the screens that need only the list
 * (Options, Your Venues, Publish, Pods at your venue, Pod Requests); it reads
 * the same lean `myVenues` query the dashboard does. A failed load is surfaced
 * as `error`, so "no venues yet" is never shown to an owner whose list simply
 * did not arrive.
 */
export function useMyVenues() {
  return useVenueList(fetchDashboardVenues);
}

async function fetchDashboardVenues(): Promise<DashboardVenue[]> {
  const data = await graphqlRequest(VenueDashboardDocument, undefined, { auth: true });
  return data.myVenues;
}

/**
 * The same list and pick for a screen that reads its venues through its own
 * query — the food desk needs each venue's `offers_food`. `fetchVenues` must be
 * stable (a module function), or the list reloads on every render.
 */
export function useVenueList<T extends SwitchableVenue>(fetchVenues: () => Promise<T[]>) {
  const { t } = useTranslation();
  const [venues, setVenues] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setVenues(await fetchVenues());
    setError(null);
  }, [fetchVenues]);
  const query = useReloadableQuery(load, {
    onError: (err) => setError(toErrorMessage(err, t('mweb.account.somethingWentWrong'))),
  });
  const { venue, venueId, selectVenue } = useSelectedVenue(venues);

  return { venues, venue, venueId, selectVenue, isLoading: query.isLoading, error };
}
