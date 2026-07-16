import { useState } from 'react';
import { format } from 'date-fns';
import {
  Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Link, Stack, TextField, Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { InfoRow } from '@duncit/ui';
import type { SlotRequestRow } from './queries';

interface Props {
  request: SlotRequestRow;
  busy: boolean;
  onApprove: (slotId: string) => Promise<void>;
  onDecline: (slotId: string, reason: string) => Promise<void>;
}

const slotWindow = (row: SlotRequestRow) =>
  `${format(new Date(row.start_at), 'EEE, d MMM yyyy · h:mm a')} – ${format(new Date(row.end_at), 'h:mm a')}`;

export default function SlotRequestCard({ request, busy, onApprove, onDecline }: Readonly<Props>) {
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState('');

  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={800} noWrap>{request.pod_title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {request.pod_description || 'No description provided.'}
            </Typography>
          </Box>
          <Chip size="small" color="warning" label="Awaiting decision" />
        </Stack>
        <Divider />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 1, md: 3 }}>
          <Detail label="Venue" value={request.venue_name} />
          <Detail label="Slot" value={slotWindow(request)} />
          <Detail label="Slot price" value={request.price > 0 ? `₹${request.price.toLocaleString('en-IN')}` : 'Free'} />
          <Detail label="Requested" value={format(new Date(request.requested_at), 'd MMM yyyy, h:mm a')} />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 1, md: 3 }}>
          <Detail label="Host" value={request.host_name || '—'} />
          <Detail
            label="Email"
            value={request.host_email ? <Link href={`mailto:${request.host_email}`}>{request.host_email}</Link> : '—'}
          />
          <Detail
            label="Phone"
            value={request.host_phone ? <Link href={`tel:${request.host_phone}`}>{request.host_phone}</Link> : '—'}
          />
        </Stack>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            size="small"
            color="error"
            variant="outlined"
            startIcon={<CancelIcon />}
            disabled={busy}
            onClick={() => setDeclineOpen(true)}
          >
            Decline
          </Button>
          <Button
            size="small"
            color="success"
            variant="contained"
            startIcon={<CheckCircleIcon />}
            disabled={busy}
            onClick={() => setConfirmApprove(true)}
          >
            Approve
          </Button>
        </Stack>
      </Stack>

      <Dialog open={confirmApprove} onClose={() => setConfirmApprove(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Approve this slot booking?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            "{request.pod_title}" will be confirmed for {slotWindow(request)} and the pod goes live immediately.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmApprove(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            disabled={busy}
            onClick={async () => {
              await onApprove(request.slot_id);
              setConfirmApprove(false);
            }}
          >
            Approve booking
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={declineOpen} onClose={() => setDeclineOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Decline this slot booking?</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              The slot opens up again and the host is notified that the request was declined.
            </Typography>
            <TextField
              label="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              multiline
              minRows={2}
              inputProps={{ maxLength: 280 }}
              helperText="Shared with the host so they can follow up"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeclineOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={busy}
            onClick={async () => {
              await onDecline(request.slot_id, reason.trim());
              setDeclineOpen(false);
            }}
          >
            Decline booking
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

function Detail({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <InfoRow
      label={label}
      value={value}
      valueWeight={600}
      valueSx={{ wordBreak: 'break-word' }}
      sx={{ minWidth: 0 }}
    />
  );
}
