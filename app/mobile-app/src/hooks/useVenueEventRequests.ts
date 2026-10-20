import { useCallback, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import type { EventRequestOfferInput, EventRequestResponse } from '@/generated/graphql/graphql';
import {
  RespondToEventRequestDocument,
  VenueEventRequestsDocument,
} from '@/graphql/venue-event-requests';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

export type EventRequestRow = ResultOf<
  typeof VenueEventRequestsDocument
>['myReceivedEventRequestsTable']['rows'][number];

/** One page of requests; "Load more" asks for the next. */
const PAGE_SIZE = 20;

/**
 * Workshop & Event Requests sent to the owner's venues, newest first, and the
 * owner's answer. An answer re-reads the list rather than patching a row: the
 * server sets the status, the frozen quote and the response time.
 */
export function useVenueEventRequests() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<EventRequestRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const data = await graphqlRequest(
      VenueEventRequestsDocument,
      { query: { page: 1, page_size: PAGE_SIZE * pages } },
      { auth: true },
    );
    setRows(data.myReceivedEventRequestsTable.rows);
    setTotal(data.myReceivedEventRequestsTable.total);
    setError(null);
  }, [pages]);

  const { isLoading, refetch } = useReloadableQuery(load, {
    onError: (e) => setError(toErrorMessage(e, t('availability.eventInbox.loadFailed'))),
  });

  const respond = useCallback(
    async (
      id: string,
      response: EventRequestResponse,
      note: string,
      offer: EventRequestOfferInput | null,
    ) => {
      setBusy(true);
      try {
        await graphqlRequest(
          RespondToEventRequestDocument,
          { id, response, note: note.trim() || null, offer },
          { auth: true },
        );
        setFeedback({ ok: true, text: t('availability.eventInbox.answered') });
        await load();
        return true;
      } catch (e) {
        setFeedback({
          ok: false,
          text: toErrorMessage(e, t('availability.eventInbox.answerFailed')),
        });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [load, t],
  );

  return {
    rows,
    total,
    hasMore: rows.length < total,
    loadMore: () => setPages((value) => value + 1),
    isLoading,
    error,
    refetch,
    busy,
    feedback,
    clearFeedback: () => setFeedback(null),
    respond,
  };
}
