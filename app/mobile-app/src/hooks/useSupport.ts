import { useEffect, useState } from 'react';
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

  return { tickets, isLoading, error, reload: () => setReloadKey((k) => k + 1) };
}

/** Opens a new support ticket and returns its id (for the details redirect). */
export async function createTicket(
  subject: string,
  body: string,
  category: string,
  attachments: string[] = [],
) {
  const data = await graphqlRequest(
    CreateTicketDocument,
    { input: { subject, body_text: body, category: category as never, attachments } },
    { auth: true },
  );
  return data.createTicket.id;
}
