import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  EmailTicketTranscriptDocument,
  ReopenTicketDocument,
  ReplyToTicketDocument,
  ResolveTicketDocument,
  SubmitTicketFeedbackDocument,
  TicketDetailsDocument,
  TicketTranscriptDocument,
  UnifiedSupportTicketsDocument,
} from '@/graphql/support-chat';
import { TranscriptFormat } from '@/generated/graphql/graphql';
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

  const reopen = useCallback(
    async (reason: string) => {
      await graphqlRequest(
        ReopenTicketDocument,
        { ticketId, reason: reason.trim() || null },
        { auth: true },
      );
      await reload();
    },
    [ticketId, reload],
  );

  const resolve = useCallback(async () => {
    await graphqlRequest(ResolveTicketDocument, { ticketId }, { auth: true });
    await reload();
  }, [ticketId, reload]);

  const submitFeedback = useCallback(
    async (rating: number, comment: string) => {
      await graphqlRequest(
        SubmitTicketFeedbackDocument,
        { ticketId, rating, comment: comment.trim() || null },
        { auth: true },
      );
      await reload();
    },
    [ticketId, reload],
  );

  const getTranscript = useCallback(
    async (format: TranscriptFormat = TranscriptFormat.Txt) => {
      const data = await graphqlRequest(
        TicketTranscriptDocument,
        { ticketId, format },
        { auth: true },
      );
      return data.ticketTranscript;
    },
    [ticketId],
  );

  const emailTranscript = useCallback(
    async (email: string) => {
      await graphqlRequest(
        EmailTicketTranscriptDocument,
        { ticketId, email: email.trim(), format: TranscriptFormat.Docx },
        { auth: true },
      );
    },
    [ticketId],
  );

  return {
    ticket,
    isLoading,
    reply,
    reopen,
    resolve,
    submitFeedback,
    getTranscript,
    emailTranscript,
    reload,
  };
}
