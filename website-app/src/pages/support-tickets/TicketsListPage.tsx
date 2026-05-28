import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { formatDistanceToNow } from 'date-fns';
import UploadField from '../../components/UploadField';
import {
  CREATE_TICKET,
  MY_TICKETS,
  type TicketCategory,
  type TicketListItem,
  type TicketStatus,
} from './queries';

const STATUS_COLOR: Record<TicketStatus, 'primary' | 'warning' | 'success' | 'default'> = {
  OPEN: 'primary',
  PENDING: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
};

const CATEGORIES: TicketCategory[] = ['GENERAL', 'PAYMENT', 'BOOKING', 'SAFETY', 'TECHNICAL', 'OTHER'];

export default function TicketsListPage() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ myTickets: TicketListItem[] }>(MY_TICKETS, {
    fetchPolicy: 'cache-and-network',
  });
  const items = data?.myTickets ?? [];

  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('GENERAL');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [createTicket, { loading: creating }] = useMutation(CREATE_TICKET);

  const reset = () => {
    setSubject('');
    setCategory('GENERAL');
    setMessage('');
    setAttachments([]);
  };

  const submit = async () => {
    if (!subject.trim() || !message.trim()) return;
    const res = await createTicket({
      variables: {
        input: { subject: subject.trim(), category, body_text: message.trim(), attachments },
      },
    });
    const id = res.data?.createTicket?.id;
    setOpen(false);
    reset();
    if (id) navigate(`/tickets/${id}`);
    else refetch();
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            My Tickets
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Raise a support ticket and track replies from our team.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          New Ticket
        </Button>
      </Stack>

      {loading && !items.length ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : !items.length ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          You haven't raised any tickets yet.
        </Typography>
      ) : (
        items.map((t) => (
          <Paper
            key={t.id}
            variant="outlined"
            onClick={() => navigate(`/tickets/${t.id}`)}
            sx={{ p: 1.75, cursor: 'pointer' }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                  {t.subject}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t.category} · {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}
                </Typography>
              </Box>
              <Chip size="small" color={STATUS_COLOR[t.status]} label={t.status} />
            </Stack>
          </Paper>
        ))
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Ticket</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} fullWidth autoFocus />
            <TextField
              select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
              fullWidth
            >
              {CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Describe the issue"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              fullWidth
              multiline
              minRows={4}
            />
            <UploadField value={attachments} onChange={setAttachments} folder="/support/tickets" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={creating || !subject.trim() || !message.trim()} onClick={submit}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
