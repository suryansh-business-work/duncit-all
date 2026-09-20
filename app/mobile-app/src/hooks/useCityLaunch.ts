import { useCallback, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { logs } from '@duncit/logs';
import { parseApiError } from '@duncit/utils';

import {
  LocationLaunchStatusDocument,
  SubscribeLocationLaunchDocument,
} from '@/graphql/city-launch';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { graphqlRequest } from '@/services/graphql.client';
import { errorCode } from '@/utils/errors';

export type CityLaunchStatus = NonNullable<
  ResultOf<typeof LocationLaunchStatusDocument>['locationLaunchStatus']
>;

/** Why a subscribe did not land — each one has its own copy and next step. */
export type CityLaunchProblem = 'WHATSAPP_REQUIRED' | 'UNAUTHENTICATED' | 'FAILED';

function problemOf(error: unknown): CityLaunchProblem {
  const code = errorCode(error);
  if (code === 'WHATSAPP_REQUIRED' || code === 'UNAUTHENTICATED') return code;
  logs.mobileApp.error('city-launch', 'subscribe', { error });
  return 'FAILED';
}

/**
 * A not-yet-launched city's waitlist: its live status (asked fresh on every
 * mount and pull, so the count is never stale) and the subscribe action, whose
 * answer IS the new status. The twin of mWeb's city-launch hook (rule 27).
 */
export function useCityLaunch(locationId: string) {
  const [status, setStatus] = useState<CityLaunchStatus | null>(null);
  /** The failed load's message; '' once a load lands. */
  const [loadError, setLoadError] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [problem, setProblem] = useState<CityLaunchProblem | null>(null);

  const load = useCallback(async () => {
    const data = await graphqlRequest(
      LocationLaunchStatusDocument,
      { locationDocId: locationId },
      { auth: true },
    );
    setLoadError('');
    setStatus(data.locationLaunchStatus ?? null);
  }, [locationId]);

  const { isLoading } = useReloadableQuery(load, {
    enabled: Boolean(locationId),
    onError: (error) => {
      logs.mobileApp.error('city-launch', 'load', { error, locationId });
      setLoadError(parseApiError(error));
    },
  });

  /** Adds the member with their answer to the share-your-location question. */
  const subscribe = useCallback(
    (locationShared: boolean) => {
      setProblem(null);
      setSubscribing(true);
      graphqlRequest(
        SubscribeLocationLaunchDocument,
        { locationDocId: locationId, locationShared },
        { auth: true },
      )
        .then((data) => setStatus(data.subscribeLocationLaunch))
        .catch((error: unknown) => setProblem(problemOf(error)))
        .finally(() => setSubscribing(false));
    },
    [locationId],
  );

  return { status, isLoading, loadError, subscribing, problem, subscribe };
}
