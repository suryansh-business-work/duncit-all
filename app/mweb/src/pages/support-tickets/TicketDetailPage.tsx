import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import ReplayIcon from '@mui/icons-material/Replay';
import AttachmentsField from '../../forms/support-form/AttachmentsField';
import ReopenReasonDialog from '../support-chat/ReopenReasonDialog';
import { canReopen } from '../support-chat/chatHelpers';
import { useDateFormat } from '../../utils/dateFormat';
import TicketMeta from './TicketMeta';
import TicketBubble from './TicketBubble';
import { REOPEN_TICKET, REPLY_TO_TICKET, TICKET, type TicketDetail, type TicketStatus } from './queries';

const STATUS_COLOR: Record<TicketStatus, 'primary' | 'warning' | 'success' | 'default'> = {
  OPEN: 'primary',
  PENDING: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ ticket: TicketDetail | null }>(TICKET, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const [reply, { loading: replying }] = useMutation(REPLY_TO_TICKET, { onCompleted: () => refetch() });
  const [reopenTicket, { loading: reopening }] = useMutation(REOPEN_TICKET, { onCompleted: () => refetch() });
  const { formatDateTime } = useDateFormat();
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);

  const ticket = data?.ticket;
  // A resolved/closed ticket can be re-opened within the server window (Bug 3/11).
  const isResolved = ticket?.status === 'CLOSED' || ticket?.status === 'RESOLVED';
  const reopenable = isResolved && canReopen(ticket?.reopen_deadline);

  const send = async () => {
    if (!message.trim() && attachments.length === 0) return;
    await reply({ variables: { ticket_id: id, body_text: message.trim() || '(attachment)', attachments } });
    setMessage('');
    setAttachments([]);
  };

  const reopen = async (reason: string) => {
    if (!id) return;
    setReopenError(null);
    try {
      await reopenTicket({ variables: { ticket_id: id, reason } });
      setReopenOpen(false);
    } catch (e) {
      setReopenError(e instanceof Error ? e.message : 'Could not re-open this ticket.');
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton size="small" onClick={() => navigate(-1)} aria-label="Back" sx={{ bgcolor: 'action.hover' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 900, flex: 1 }} noWrap>
          {ticket?.subject ?? 'Ticket'}
        </Typography>
        {ticket && <Chip size="small" color={STATUS_COLOR[ticket.status]} label={ticket.status} />}
      </Stack>

      {loading && !ticket ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : !ticket ? (
        <Typography variant="body2" color="text.secondary">
          This ticket could not be found.
        </Typography>
      ) : (
        <>
          <TicketMeta ticket={ticket} />

          <Stack spacing={1.25}>
            {ticket.messages.map((m) => (
              <TicketBubble key={m.id} msg={m} />
            ))}
          </Stack>

          {isResolved && (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, bgcolor: 'action.hover' }}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Stack sx={{ minWidth: 0 }}>
                  <Typography variant="body2" color="text.secondary">
                    This ticket is {ticket.status.toLowerCase()}. Re-open it to continue.
                  </Typography>
                  {reopenable && ticket.reopen_deadline && (
                    <Typography variant="caption" color="text.secondary">
                      You can reopen this until {formatDateTime(ticket.reopen_deadline)}
                    </Typography>
                  )}
                  {!reopenable && (
                    <Typography variant="caption" color="text.secondary">
                      The reopen window has passed — raise a new ticket if you still need help.
                    </Typography>
                  )}
                </Stack>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ReplayIcon />}
                  disabled={!reopenable || reopening}
                  onClick={() => setReopenOpen(true)}
                  sx={{ borderRadius: 99, fontWeight: 800, flexShrink: 0 }}
                >
                  Re-open
                </Button>
              </Stack>
            </Paper>
          )}

          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
            <Stack spacing={1}>
              <AttachmentsField attachments={attachments} setAttachments={setAttachments} />
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Write a reply…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  multiline
                  maxRows={4}
                />
                <Button
                  variant="contained"
                  endIcon={<SendIcon />}
                  disabled={replying || (!message.trim() && attachments.length === 0)}
                  onClick={send}
                >
                  Send
                </Button>
              </Stack>
            </Stack>
          </Paper>

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
