import { useCallback, useState } from 'react';

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
  const { t } = useTranslation();
  const [venues, setVenues] = useState<DashboardVenue[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await graphqlRequest(VenueDashboardDocument, undefined, { auth: true });
    setVenues(data.myVenues);
    setError(null);
  }, []);
  const query = useReloadableQuery(load, {
    onError: (err) => setError(toErrorMessage(err, t('mweb.account.somethingWentWrong'))),
  });
  const { venue, venueId, selectVenue } = useSelectedVenue(venues);

  return { venues, venue, venueId, selectVenue, isLoading: query.isLoading, error };
}
