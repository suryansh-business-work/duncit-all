import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
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
import { format } from 'date-fns';
import AttachmentsField from '../../forms/support-form/AttachmentsField';
import {
  REPLY_TO_TICKET,
  TICKET,
  type TicketDetail,
  type TicketMessage,
  type TicketStatus,
} from './queries';

const STATUS_COLOR: Record<TicketStatus, 'primary' | 'warning' | 'success' | 'default'> = {
  OPEN: 'primary',
  PENDING: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
};

function Bubble({ msg }: { msg: TicketMessage }) {
  const isUser = msg.author_role === 'USER';
  return (
    <Stack direction="row" sx={{ justifyContent: isUser ? 'flex-end' : 'flex-start' }} spacing={1}>
      {!isUser && (
        <Avatar src={msg.author_photo || undefined} sx={{ width: 28, height: 28, fontSize: 12 }}>
          {msg.author_name?.[0]?.toUpperCase() || 'S'}
        </Avatar>
      )}
      <Paper
        variant="outlined"
        sx={{
          p: 1.25,
          maxWidth: '78%',
          borderRadius: 3,
          bgcolor: isUser ? 'primary.main' : 'background.paper',
          color: isUser ? 'primary.contrastText' : 'text.primary',
        }}
      >
        {!isUser && (
          <Typography variant="caption" sx={{ fontWeight: 800 }}>
            {msg.author_name || 'Support'}
          </Typography>
        )}
        <Typography variant="body2">{msg.body_text}</Typography>
        {msg.attachments.length > 0 && (
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
            {msg.attachments.map((url, i) => (
              <a key={url + i} href={url} target="_blank" rel="noopener noreferrer">
                <Avatar variant="rounded" src={url} sx={{ width: 54, height: 54 }} />
              </a>
            ))}
          </Stack>
        )}
        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.25 }}>
          {format(new Date(msg.created_at), 'd MMM, HH:mm')}
        </Typography>
      </Paper>
    </Stack>
  );
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ ticket: TicketDetail | null }>(TICKET, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const [reply, { loading: replying }] = useMutation(REPLY_TO_TICKET, { onCompleted: () => refetch() });
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);

  const ticket = data?.ticket;
  const closed = ticket?.status === 'CLOSED';

  const send = async () => {
    if (!message.trim() && attachments.length === 0) return;
    await reply({ variables: { ticket_id: id, body_text: message.trim() || '(attachment)', attachments } });
    setMessage('');
    setAttachments([]);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton size="small" onClick={() => navigate('/support/live')} aria-label="Back" sx={{ bgcolor: 'action.hover' }}>
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
          <Stack spacing={1.25}>
            {ticket.messages.map((m) => (
              <Bubble key={m.id} msg={m} />
            ))}
          </Stack>

          {!closed && (
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
          )}
        </>
      )}
    </Stack>
  );
}
