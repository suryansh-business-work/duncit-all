import { useCallback, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { VenueSlotRequestHistoryDocument } from '@/graphql/venue-event-requests';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

export type SlotRequestHistoryRow = ResultOf<
  typeof VenueSlotRequestHistoryDocument
>['myVenueSlotRequestHistory'][number];

/** How far back the history reads. */
const HISTORY_LIMIT = 50;

/**
 * Slot requests from before instant booking, newest decision first — kept
 * read-only. The ones still PENDING are answered from the live queue above
 * the list (`useVenueSlotRequests`), so this list holds only decided rows.
 */
export function useSlotRequestHistory() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<SlotRequestHistoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await graphqlRequest(
      VenueSlotRequestHistoryDocument,
      { limit: HISTORY_LIMIT },
      { auth: true },
    );
    setRows(data.myVenueSlotRequestHistory.filter((row) => row.decision !== 'NONE'));
    setError(null);
  }, []);

  const { isLoading, refetch } = useReloadableQuery(load, {
    onError: (e) => setError(toErrorMessage(e, t('availability.eventInbox.history.loadFailed'))),
  });

  return { rows, isLoading, error, refetch };
}
