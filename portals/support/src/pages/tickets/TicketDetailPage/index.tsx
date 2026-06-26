import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Chip, CircularProgress, Divider, IconButton, Snackbar, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import { REPLY_TO_TICKET, TICKET, type Ticket, type TicketStatus } from '../../../graphql/tickets';
import RichTextEditor, { htmlToText } from '../../../components/RichTextEditor';
import UploadField from '../../../components/UploadField';
import { useSupportSocket } from '../../../lib/useSupportSocket';
import TicketHeader from './TicketHeader';
import TicketThread from './TicketThread';
import { useTicketActions } from './useTicketActions';

const STATUS_COLOR: Record<TicketStatus, 'primary' | 'warning' | 'success' | 'default'> = {
  OPEN: 'primary',
  PENDING: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ ticket: Ticket | null }>(TICKET, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const [reply, { loading: replying }] = useMutation(REPLY_TO_TICKET, { onCompleted: () => refetch() });
  const actions = useTicketActions(id, () => refetch());

  const [bodyHtml, setBodyHtml] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);

  useSupportSocket({
    onTicketUpdate: (t: { id?: string }) => {
      if (t?.id === id) refetch();
    },
  });

  const ticket = data?.ticket;

  const send = async () => {
    const bodyText = htmlToText(bodyHtml);
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
          <Chip size="small" color={STATUS_COLOR[ticket.status]} label={ticket.status} />
          <Chip size="small" variant="outlined" label={ticket.category} />
          <Typography variant="body2" color="text.secondary">
            {ticket.user.name}
            {ticket.user.phone ? ` · ${ticket.user.phone}` : ''}
          </Typography>
        </Stack>

        <TicketThread ticket={ticket} />

        <Divider />

        <Box>
          <RichTextEditor value={bodyHtml} onChange={setBodyHtml} placeholder="Write a reply…" minHeight={110} />
          <Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{ mt: 1 }} spacing={1}>
            <UploadField value={attachments} onChange={setAttachments} folder="/support/tickets" label="Attach" />
            <Button variant="contained" endIcon={<SendIcon />} disabled={replying || !htmlToText(bodyHtml)} onClick={send}>
              Send
            </Button>
          </Stack>
        </Box>
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
          onResolve={actions.resolve}
          onReopen={actions.reopen}
          onDownload={actions.download}
          onEmail={actions.email}
        />
      ) : (
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton size="small" onClick={() => navigate('/tickets')} aria-label="Back">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Ticket
          </Typography>
        </Stack>
      )}
      {renderBody()}
      <Snackbar open={Boolean(actions.notice)} autoHideDuration={4000} onClose={actions.clearNotice} message={actions.notice} />
    </Stack>
  );
}
