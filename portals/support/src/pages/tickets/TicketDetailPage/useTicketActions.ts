import { useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import {
  EMAIL_TICKET_TRANSCRIPT,
  REOPEN_TICKET,
  RESOLVE_TICKET,
  TICKET_TRANSCRIPT,
  UPDATE_TICKET_PRIORITY,
  UPDATE_TICKET_STATUS,
  type TicketPriority,
  type TicketStatus,
  type TicketTranscript,
} from '../../../graphql/tickets';
import type { TranscriptFormat } from '../../../graphql/supportChat';
import { saveTranscript } from '../../../lib/downloadTranscript';

/** Bundles the ticket resolve / reopen / status / transcript mutations + a
 * transient notice so the page component stays small. */
export function useTicketActions(ticketId: string | undefined, onChanged: () => void) {
  const client = useApolloClient();
  const [notice, setNotice] = useState('');
  const [resolveTicket] = useMutation(RESOLVE_TICKET, { onCompleted: onChanged });
  const [reopenTicket] = useMutation(REOPEN_TICKET, { onCompleted: onChanged });
  const [updateStatus] = useMutation(UPDATE_TICKET_STATUS, { onCompleted: onChanged });
  const [updatePriority] = useMutation(UPDATE_TICKET_PRIORITY, { onCompleted: onChanged });
  const [emailTicket] = useMutation(EMAIL_TICKET_TRANSCRIPT);

  const resolve = () =>
    resolveTicket({ variables: { ticket_id: ticketId } }).catch((e: Error) => setNotice(e.message));

  const reopen = () =>
    reopenTicket({ variables: { ticket_id: ticketId, reason: null } }).catch((e: Error) => setNotice(e.message));

  const setStatus = (status: TicketStatus) =>
    updateStatus({ variables: { ticket_id: ticketId, status } }).catch((e: Error) => setNotice(e.message));

  const setPriority = (priority: TicketPriority) =>
    updatePriority({ variables: { ticket_id: ticketId, priority } }).catch((e: Error) =>
      setNotice(e.message)
    );

  // Permanently close a resolved ticket — reuses the status mutation (CLOSED).
  const close = () =>
    updateStatus({ variables: { ticket_id: ticketId, status: 'CLOSED' } }).catch((e: Error) =>
      setNotice(e.message)
    );

  const download = async (format: TranscriptFormat) => {
    try {
      const { data } = await client.query<{ ticketTranscript: TicketTranscript }>({
        query: TICKET_TRANSCRIPT,
        variables: { ticket_id: ticketId, format },
        fetchPolicy: 'no-cache',
      });
      if (data?.ticketTranscript) saveTranscript(data.ticketTranscript, format);
    } catch (e) {
      setNotice((e as Error).message);
    }
  };

  const email = async (address: string) => {
    try {
      await emailTicket({ variables: { ticket_id: ticketId, email: address, format: 'DOCX' } });
      setNotice(`Transcript emailed to ${address}.`);
    } catch (e) {
      setNotice((e as Error).message);
    }
  };

  return { notice, clearNotice: () => setNotice(''), resolve, reopen, setStatus, setPriority, close, download, email };
}
