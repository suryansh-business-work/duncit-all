import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import { format } from 'date-fns';
import {
  REPLY_TO_TICKET,
  TICKET,
  UPDATE_TICKET_STATUS,
  type Ticket,
  type TicketMessage,
  type TicketStatus,
} from '../../graphql/tickets';
import RichTextEditor, { htmlToText } from '../../components/RichTextEditor';
import UploadField from '../../components/UploadField';
import { useSupportSocket } from '../../lib/useSupportSocket';

const STATUS_COLOR: Record<TicketStatus, 'primary' | 'warning' | 'success' | 'default'> = {
  OPEN: 'primary',
  PENDING: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
};

const STATUSES: TicketStatus[] = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'];

function MessageBubble({ msg }: Readonly<{ msg: TicketMessage }>) {
  const isAgent = msg.author_role === 'AGENT';
  return (
    <Stack direction="row" spacing={1.25} sx={{ flexDirection: isAgent ? 'row-reverse' : 'row' }}>
      <Avatar src={msg.author_photo || undefined} sx={{ width: 32, height: 32, fontSize: 13 }}>
        {msg.author_name?.[0]?.toUpperCase() || '?'}
      </Avatar>
      <Paper
        variant="outlined"
        sx={{
          p: 1.25,
          maxWidth: '75%',
          bgcolor: isAgent ? 'primary.main' : 'background.paper',
          color: isAgent ? 'primary.contrastText' : 'text.primary',
          borderColor: isAgent ? 'primary.main' : 'divider',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {msg.author_name || (isAgent ? 'Support' : 'User')}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {format(new Date(msg.created_at), 'd MMM, HH:mm')}
          </Typography>
        </Stack>
        {msg.body_html ? (
          <Box
            sx={{ '& p': { m: 0 }, fontSize: 14 }}
            dangerouslySetInnerHTML={{ __html: msg.body_html }}
          />
        ) : (
          <Typography variant="body2">{msg.body_text}</Typography>
        )}
        {msg.attachments.length > 0 && (
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {msg.attachments.map((url, i) => (
              <a key={url + i} href={url} target="_blank" rel="noopener noreferrer">
                <Avatar variant="rounded" src={url} sx={{ width: 56, height: 56 }} />
              </a>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ ticket: Ticket | null }>(TICKET, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const [reply, { loading: replying }] = useMutation(REPLY_TO_TICKET, {
    onCompleted: () => refetch(),
  });
  const [updateStatus] = useMutation(UPDATE_TICKET_STATUS, { onCompleted: () => refetch() });

  const [bodyHtml, setBodyHtml] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);

  useSupportSocket({
    onTicketUpdate: (t: any) => {
      if (t?.id === id) refetch();
    },
  });

  const ticket = data?.ticket;

  const send = async () => {
    const bodyText = htmlToText(bodyHtml);
    if (!bodyText) return;
    await reply({
      variables: { ticket_id: id, body_html: bodyHtml, body_text: bodyText, attachments },
    });
    setBodyHtml('');
    setAttachments([]);
  };

  return (
    <Stack spacing={2} sx={{ height: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton size="small" onClick={() => navigate('/tickets')} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 800, flex: 1 }} noWrap>
          {ticket?.subject ?? 'Ticket'}
        </Typography>
        {ticket && (
          <TextField
            select
            size="small"
            value={ticket.status}
            onChange={(e) => updateStatus({ variables: { ticket_id: id, status: e.target.value } })}
            sx={{ minWidth: 130 }}
          >
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        )}
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
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip size="small" color={STATUS_COLOR[ticket.status]} label={ticket.status} />
            <Chip size="small" variant="outlined" label={ticket.category} />
            <Typography variant="body2" color="text.secondary">
              {ticket.user.name}
              {ticket.user.phone ? ` · ${ticket.user.phone}` : ''}
            </Typography>
          </Stack>

          <Stack spacing={1.5} sx={{ flex: 1 }}>
            {(ticket.messages ?? []).map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}
          </Stack>

          <Divider />

          <Box>
            <RichTextEditor value={bodyHtml} onChange={setBodyHtml} placeholder="Write a reply…" minHeight={110} />
            <Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{ mt: 1 }} spacing={1}>
              <UploadField value={attachments} onChange={setAttachments} folder="/support/tickets" label="Attach" />
              <Button
                variant="contained"
                endIcon={<SendIcon />}
                disabled={replying || !htmlToText(bodyHtml)}
                onClick={send}
              >
                Send
              </Button>
            </Stack>
          </Box>
        </>
      )}
    </Stack>
  );
}
