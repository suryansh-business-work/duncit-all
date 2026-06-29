import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  EmailTicketTranscriptDocument,
  MarkTicketReadDocument,
  ReopenTicketDocument,
  ReplyToTicketDocument,
  ResolveTicketDocument,
  SubmitTicketFeedbackDocument,
  TicketDetailsDocument,
  TicketTranscriptDocument,
  UnifiedSupportTicketsDocument,
} from '@/graphql/support-chat';
import { TranscriptFormat } from '@/generated/graphql/graphql';
import { config } from '@/constants/config';
import { getAuthToken } from '@/services/auth-token';
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
  const countRef = useRef(0);
  const socketRef = useRef<Socket | null>(null);

  // Marking the thread read flips the OTHER side's Sent ticks to Seen (B12).
  const markRead = useCallback(() => {
    graphqlRequest(MarkTicketReadDocument, { ticketId }, { auth: true }).catch(() => undefined);
  }, [ticketId]);

  const reload = useCallback(async () => {
    const data = await graphqlRequest(TicketDetailsDocument, { id: ticketId }, { auth: true });
    setTicket(data.ticket ?? null);
    countRef.current = data.ticket?.messages.length ?? 0;
  }, [ticketId]);

  useEffect(() => {
    let active = true;
    reload()
      .then(() => {
        if (active) markRead();
      })
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [reload, markRead]);

  // Live ticket updates (B12): refresh the thread + read ticks without a manual
  // refetch, and mark a freshly-arrived agent reply read while it is on screen.
  useEffect(() => {
    if (!ticketId) return undefined;
    let cancelled = false;
    getAuthToken().then((token) => {
      if (cancelled || !token) return;
      const s = io(config.apiUrl, {
        path: '/socket.io',
        auth: { token },
        transports: ['websocket', 'polling'],
      });
      socketRef.current = s;
      s.on('ticket:update', (updated: TicketDetail) => {
        if (updated.id !== ticketId) return;
        // A growing thread means a new reply arrived while the user is viewing —
        // mark it read so the other side's tick turns Seen. A pure read-state
        // update (same count) must NOT re-mark, which would loop.
        if (updated.messages.length > countRef.current) markRead();
        countRef.current = updated.messages.length;
        setTicket(updated);
      });
    });
    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [ticketId, markRead]);

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
