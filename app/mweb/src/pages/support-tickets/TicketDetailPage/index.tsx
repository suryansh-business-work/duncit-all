import { useEffect, useRef, useState } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import ReopenReasonDialog from '../../support-chat/ReopenReasonDialog';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { canReopen, downloadBase64File, transcriptMime } from '../../support-chat/chatHelpers';
import { useDateFormat } from '../../../utils/dateFormat';
import TicketMeta from '../TicketMeta';
import TicketFeedbackDialog from '../TicketFeedbackDialog';
import TicketEmailDialog from '../TicketEmailDialog';
import TicketHeader from './TicketHeader';
import TicketThread, { type TicketThreadHandle } from './TicketThread';
import TicketComposer from './TicketComposer';
import ResolvedNotice from './ResolvedNotice';
import { useTicketSocket } from '../useTicketSocket';
import {
  MARK_TICKET_READ,
  REOPEN_TICKET,
  REPLY_TO_TICKET,
  RESOLVE_TICKET,
  TICKET,
  TICKET_TRANSCRIPT,
  type TicketDetail,
  type TranscriptFormat,
} from '../queries';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ ticket: TicketDetail | null }>(TICKET, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const [reply, { loading: replying }] = useMutation(REPLY_TO_TICKET, { onCompleted: () => refetch() });
  const [reopenTicket, { loading: reopening }] = useMutation(REOPEN_TICKET, { onCompleted: () => refetch() });
  const [resolveTicket, { loading: resolving }] = useMutation(RESOLVE_TICKET, { onCompleted: () => refetch() });
  const [markTicketRead] = useMutation(MARK_TICKET_READ);
  const [fetchTranscript] = useLazyQuery(TICKET_TRANSCRIPT, { fetchPolicy: 'network-only' });
  const { formatDateTime, formatTime, timeZone } = useDateFormat();

  // Mark the thread read on open (B12) so the agent's view shows the Seen tick.
  const ticketId = data?.ticket?.id;
  useEffect(() => {
    if (ticketId) markTicketRead({ variables: { ticket_id: ticketId } }).catch(() => undefined);
  }, [ticketId, markTicketRead]);
  // Live refresh so the user's own Sent ticks flip to Seen without a manual reload.
  useTicketSocket(ticketId, () => {
    refetch().catch(() => undefined);
  });

  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const ticket = data?.ticket ?? null;
  const isResolved = ticket?.status === 'CLOSED' || ticket?.status === 'RESOLVED';
  const canResolve = ticket?.status === 'OPEN' || ticket?.status === 'PENDING';
  const reopenable = isResolved && canReopen(ticket?.reopen_deadline);

  // Auto-open feedback once a resolved/closed ticket has no rating (B8).
  useEffect(() => {
    if (isResolved && ticket?.rating == null) setFeedbackOpen(true);
  }, [isResolved, ticket?.rating]);

  const threadRef = useRef<TicketThreadHandle>(null);
  const send = async (message: string, attachments: string[]) => {
    // Re-pin so the user's own reply scrolls into view even if they'd scrolled up.
    threadRef.current?.pinToBottom();
    await reply({ variables: { ticket_id: id, body_text: message || '(attachment)', attachments } });
  };

  const onResolve = async () => {
    setConfirmOpen(false);
    if (!id) return;
    await resolveTicket({ variables: { ticket_id: id } });
  };

  const reopen = async (reason: string) => {
    if (!id) return;
    setReopenError(null);
    try {
      await reopenTicket({ variables: { ticket_id: id, reason: reason || null } });
      setReopenOpen(false);
    } catch (e) {
      setReopenError(e instanceof Error ? e.message : 'Could not re-open this ticket.');
    }
  };

  const onDownload = async (format: TranscriptFormat) => {
    if (!id) return;
    const r = await fetchTranscript({ variables: { ticket_id: id, format } });
    const t = r.data?.ticketTranscript;
    if (t) downloadBase64File(t.filename, t.content_base64, transcriptMime(format));
  };

  if (loading && !ticket) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  if (!ticket) {
    return (
      <Typography variant="body2" color="text.secondary">
        This ticket could not be found.
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      <TicketHeader
        subject={ticket.subject}
        status={ticket.status}
        canResolve={canResolve}
        onBack={() => navigate(-1)}
        onResolve={() => setConfirmOpen(true)}
        onDownload={onDownload}
        onEmail={() => setEmailOpen(true)}
      />

      <TicketMeta ticket={ticket} />
      <TicketThread
        ref={threadRef}
        messages={ticket.messages}
        timeZone={timeZone}
        formatTime={formatTime}
        agentLastReadAt={ticket.agent_last_read_at}
      />

      {isResolved && (
        <ResolvedNotice
          statusLabel={ticket.status.toLowerCase()}
          reopenable={reopenable}
          reopenDeadline={ticket.reopen_deadline}
          reopening={reopening}
          formatDateTime={formatDateTime}
          onReopen={() => setReopenOpen(true)}
        />
      )}

      <TicketComposer locked={isResolved} busy={replying} onSend={send} />

      <ConfirmDialog
        open={confirmOpen}
        title="Mark as resolved?"
        message="Are you sure your issue has been resolved?"
        confirmLabel="Yes, mark as resolved"
        cancelLabel="No, continue conversation"
        busy={resolving}
        onConfirm={onResolve}
        onClose={() => setConfirmOpen(false)}
      />

      {id && (
        <>
          <TicketFeedbackDialog
            open={feedbackOpen}
            ticketId={id}
            rating={ticket.rating}
            comment={ticket.feedback_comment}
            onClose={() => setFeedbackOpen(false)}
            onSubmitted={() => refetch()}
          />
          <TicketEmailDialog open={emailOpen} ticketId={id} onClose={() => setEmailOpen(false)} />
          <ReopenReasonDialog
            open={reopenOpen}
            loading={reopening}
            error={reopenError}
            onClose={() => {
              setReopenOpen(false);
              setReopenError(null);
            }}
            onSubmit={reopen}
          />
        </>
      )}
    </Stack>
  );
}
