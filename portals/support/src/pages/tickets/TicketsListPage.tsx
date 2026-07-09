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
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { formatDistanceToNow } from 'date-fns';
import {
  CREATE_TICKET,
  TICKETS,
  type Ticket,
  type TicketCategory,
  type TicketPriority,
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

const PRIORITY_COLOR: Record<TicketPriority, 'error' | 'warning' | 'default'> = {
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'default',
};

const CATEGORIES: TicketCategory[] = ['GENERAL', 'PAYMENT', 'BOOKING', 'SAFETY', 'TECHNICAL', 'OTHER'];
const STATUSES: TicketStatus[] = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'];

export default function TicketsListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const { data, loading, refetch } = useQuery<{ tickets: Ticket[] }>(TICKETS, {
    variables: { status: statusFilter || null },
    fetchPolicy: 'cache-and-network',
  });

  useSupportSocket({
    onTicketNew: () => refetch(),
    onTicketUpdate: () => refetch(),
  });

  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('GENERAL');
  const [bodyHtml, setBodyHtml] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [createTicket, { loading: creating }] = useMutation(CREATE_TICKET);

  const items = data?.tickets ?? [];

  const resetForm = () => {
    setSubject('');
    setCategory('GENERAL');
    setBodyHtml('');
    setAttachments([]);
  };

  const submit = async () => {
    const bodyText = htmlToText(bodyHtml);
    if (!subject.trim() || !bodyText) return;
    const res = await createTicket({
      variables: {
        input: { subject: subject.trim(), category, body_html: bodyHtml, body_text: bodyText, attachments },
      },
    });
    const id = res.data?.createTicket?.id;
    setOpen(false);
    resetForm();
    if (id) navigate(`/tickets/${id}`);
    else refetch();
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} flexWrap="wrap">
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Tickets
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Support tickets from users. Open one to reply, or raise a new ticket.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TicketStatus | '')}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All</MenuItem>
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            New Ticket
          </Button>
        </Stack>
      </Stack>

      {loading && !items.length ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : !items.length ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No tickets here yet.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Ticket ID</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Last activity</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((t) => (
              <TableRow
                key={t.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/tickets/${t.id}`)}
              >
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {t.ticket_no}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t.subject}</TableCell>
                <TableCell>{t.user.name}</TableCell>
                <TableCell>{t.category}</TableCell>
                <TableCell>
                  <Chip size="small" color={STATUS_COLOR[t.status]} label={t.status} />
                </TableCell>
                <TableCell>
                  <Chip size="small" color={PRIORITY_COLOR[t.priority]} label={t.priority} />
                </TableCell>
                <TableCell>{formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Ticket</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              fullWidth
              autoFocus
            />
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
            <Box>
              <Typography variant="caption" color="text.secondary">
                Description
              </Typography>
              <RichTextEditor value={bodyHtml} onChange={setBodyHtml} placeholder="Describe the issue…" />
            </Box>
            <UploadField value={attachments} onChange={setAttachments} folder="/support/tickets" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={creating || !subject.trim() || !htmlToText(bodyHtml)}
            onClick={submit}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
