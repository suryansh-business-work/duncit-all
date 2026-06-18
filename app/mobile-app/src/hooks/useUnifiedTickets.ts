import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  ReopenTicketDocument,
  ReplyToTicketDocument,
  TicketDetailsDocument,
  UnifiedSupportTicketsDocument,
} from '@/graphql/support-chat';
import { graphqlRequest } from '@/services/graphql.client';

export type UnifiedTicket = ResultOf<
  typeof UnifiedSupportTicketsDocument
>['myUnifiedSupportTickets'][number];
export type TicketDetail = NonNullable<ResultOf<typeof TicketDetailsDocument>['ticket']>;

/** Every support item the user has raised — tickets, SOS, callbacks, chats. */
export function useUnifiedTickets() {
  const [rows, setRows] = useState<UnifiedTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    graphqlRequest(UnifiedSupportTicketsDocument, undefined, { auth: true })
      .then((data) => active && setRows(data.myUnifiedSupportTickets))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Could not load.'))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { rows, isLoading, error };
}

/** One ticket with its full thread + a reply action. */
export function useTicketDetails(ticketId: string) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await graphqlRequest(TicketDetailsDocument, { id: ticketId }, { auth: true });
    setTicket(data.ticket ?? null);
  }, [ticketId]);

  useEffect(() => {
    let active = true;
    reload()
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [reload]);

  const reply = useCallback(
    async (bodyText: string) => {
      await graphqlRequest(
        ReplyToTicketDocument,
        { ticketId, bodyText: bodyText.trim() },
        { auth: true },
      );
      await reload();
    },
    [ticketId, reload],
  );

  const reopen = useCallback(async () => {
    await graphqlRequest(ReopenTicketDocument, { ticketId }, { auth: true });
    await reload();
  }, [ticketId, reload]);

  return { ticket, isLoading, reply, reopen, reload };
}
