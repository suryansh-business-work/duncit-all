import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { CreateTicketDocument, MyTicketsDocument } from '@/graphql/support';
import { graphqlRequest } from '@/services/graphql.client';

export type Ticket = ResultOf<typeof MyTicketsDocument>['myTickets'][number];

/** The user's support tickets (auth), with a manual reload. */
export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    graphqlRequest(MyTicketsDocument, undefined, { auth: true })
      .then((data) => active && setTickets(data.myTickets))
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [reloadKey]);

  /**
   * STABLE on purpose. A fresh arrow function here is returned to every caller
   * on every render, and `MyTicketsList` feeds it to `useFocusEffect` as a
   * dependency — so each reload re-rendered, minted a new `reload`, re-ran the
   * focus effect and reloaded again. That loop fired ~35,000 requests until the
   * browser ran out of sockets with ERR_INSUFFICIENT_RESOURCES, which then took
   * down every OTHER query on the page: creating a ticket, loading the list,
   * loading the filters.
   */
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return { tickets, isLoading, error, reload };
}

/** Opens a new support ticket and returns its id (for the details redirect). */
export async function createTicket(
  subject: string,
  body: string,
  category: string,
  attachments: string[] = [],
  pod?: { id: string; title: string },
) {
  const data = await graphqlRequest(
    CreateTicketDocument,
    {
      input: {
        subject,
        body_text: body,
        category: category as never,
        attachments,
        ...(pod ? { pod_id: pod.id, pod_title: pod.title } : {}),
      },
    },
    { auth: true },
  );
  // The number is part of what a ticket IS to a caller now — the payment
  // failure dialog quotes it back to the buyer as their reference.
  return { id: data.createTicket.id, ticketNo: data.createTicket.ticket_no ?? null };
}
