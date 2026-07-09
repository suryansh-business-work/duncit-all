import { useState } from 'react';
import { Box, IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import ConfirmDialog from '../../../components/ConfirmDialog';
import TranscriptMenu from '../../../components/TranscriptMenu';
import type { Ticket, TicketPriority, TicketStatus, TranscriptFormat } from '../../../graphql/tickets';

const STATUSES: TicketStatus[] = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'];
const PRIORITIES: TicketPriority[] = ['HIGH', 'MEDIUM', 'LOW'];
const RESOLVED = new Set<TicketStatus>(['RESOLVED', 'CLOSED']);

interface Props {
  ticket: Ticket;
  onBack: () => void;
  onStatus: (status: TicketStatus) => void;
  onPriority: (priority: TicketPriority) => void;
  onResolve: () => void;
  onReopen: () => void;
  onDownload: (format: TranscriptFormat) => void;
  onEmail: (email: string) => void;
}

/** Ticket detail header: subject + ticket no + status/priority setters + resolve / re-open + export. */
export default function TicketHeader({ ticket, onBack, onStatus, onPriority, onResolve, onReopen, onDownload, onEmail }: Readonly<Props>) {
  const [confirmResolve, setConfirmResolve] = useState(false);
  const isResolved = RESOLVED.has(ticket.status);

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <IconButton size="small" onClick={onBack} aria-label="Back">
        <ArrowBackIcon />
      </IconButton>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
          {ticket.ticket_no}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800 }} noWrap>
          {ticket.subject}
        </Typography>
      </Box>

      {isResolved ? (
        <Tooltip title="Re-open ticket">
          <IconButton size="small" color="primary" aria-label="Re-open ticket" onClick={onReopen}>
            <ReplayIcon />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title="Mark resolved">
          <IconButton size="small" color="success" aria-label="Mark resolved" onClick={() => setConfirmResolve(true)}>
            <CheckCircleIcon />
          </IconButton>
        </Tooltip>
      )}

      <TranscriptMenu onDownload={onDownload} onEmail={onEmail} />

      <TextField
        select
        size="small"
        label="Priority"
        value={ticket.priority}
        onChange={(e) => onPriority(e.target.value as TicketPriority)}
        sx={{ minWidth: 120 }}
      >
        {PRIORITIES.map((p) => (
          <MenuItem key={p} value={p}>
            {p}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Status"
        value={ticket.status}
        onChange={(e) => onStatus(e.target.value as TicketStatus)}
        sx={{ minWidth: 130 }}
      >
        {STATUSES.map((s) => (
          <MenuItem key={s} value={s}>
            {s}
          </MenuItem>
        ))}
      </TextField>

      <ConfirmDialog
        open={confirmResolve}
        title="Mark this ticket resolved?"
        message="The ticket will be marked resolved and the user can leave feedback. You can re-open it later if needed."
        confirmLabel="Mark resolved"
        confirmColor="success"
        onConfirm={() => {
          setConfirmResolve(false);
          onResolve();
        }}
        onClose={() => setConfirmResolve(false)}
      />
    </Stack>
  );
}
