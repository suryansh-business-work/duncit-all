import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Chip, CircularProgress, Divider, Snackbar, Stack, Typography } from '@mui/material';
import { BackHeader, StatusChip } from '@duncit/ui';
import {
  MARK_TICKET_READ,
  REPLY_TO_TICKET,
  TICKET,
  type Ticket,
} from '../../../graphql/tickets';
import { htmlToText } from '../../../components/RichTextEditor';
import { useSupportSocket } from '../../../lib/useSupportSocket';
import { TICKET_PRIORITY_COLORS, TICKET_STATUS_COLORS } from '../../../lib/statusMaps';
import TicketHeader from './TicketHeader';
import TicketThread from './TicketThread';
import TicketComposerArea from './TicketComposerArea';
import TicketUserDetails from './TicketUserDetails';
import { useTicketActions } from './useTicketActions';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ ticket: Ticket | null }>(TICKET, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const [reply, { loading: replying }] = useMutation(REPLY_TO_TICKET, { onCompleted: () => refetch() });
  const [markTicketRead] = useMutation(MARK_TICKET_READ);
  const actions = useTicketActions(id, () => refetch());

  const [bodyHtml, setBodyHtml] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);

  useSupportSocket({
    onTicketUpdate: (t: { id?: string }) => {
      if (t?.id === id) refetch();
    },
  });

  const ticket = data?.ticket;

  // Mark the thread read on open (B12) so the user's Sent ticks flip to Seen.
  const ticketId = ticket?.id;
  useEffect(() => {
    if (ticketId) markTicketRead({ variables: { ticket_id: ticketId } }).catch(() => undefined);
  }, [ticketId, markTicketRead]);

  const send = async () => {
    const bodyText = htmlToText(bodyHtml);
    /* v8 ignore next -- defensive: the Send button is disabled whenever htmlToText(bodyHtml) is empty */
    if (!bodyText) return;
    await reply({ variables: { ticket_id: id, body_html: bodyHtml, body_text: bodyText, attachments } });
    setBodyHtml('');
    setAttachments([]);
  };

  const renderBody = () => {
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
      <>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <StatusChip status={ticket.status} colorMap={TICKET_STATUS_COLORS} />
          <StatusChip
            status={ticket.priority}
            colorMap={TICKET_PRIORITY_COLORS}
            label={`${ticket.priority} priority`}
          />
          <Chip size="small" variant="outlined" label={ticket.category} />
        </Stack>

        <TicketUserDetails user={ticket.user} />

        <TicketThread ticket={ticket} />

        <Divider />

        <TicketComposerArea
          status={ticket.status}
          bodyHtml={bodyHtml}
          attachments={attachments}
          replying={replying}
          onBodyHtml={setBodyHtml}
          onAttachments={setAttachments}
          onSend={send}
          onClose={actions.close}
        />
      </>
    );
  };

  return (
    <Stack spacing={2} sx={{ height: '100%' }}>
      {ticket ? (
        <TicketHeader
          ticket={ticket}
          onBack={() => navigate('/tickets')}
          onStatus={actions.setStatus}
          onPriority={actions.setPriority}
          onResolve={actions.resolve}
          onReopen={actions.reopen}
          onDownload={actions.download}
          onEmail={actions.email}
        />
      ) : (
        <BackHeader onBack={() => navigate('/tickets')} title="Ticket" titleWeight={800} />
      )}
      {renderBody()}
      <Snackbar open={Boolean(actions.notice)} autoHideDuration={4000} onClose={actions.clearNotice} message={actions.notice} />
    </Stack>
  );
}
