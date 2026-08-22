import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Link, Stack, TextField, Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useDateFormat, useTranslation, formatDateTime } from '@duncit/app-settings';
import { slotSpanLabel } from '@duncit/slots';
import { InfoRow } from '@duncit/ui';
import type { SlotRequestRow } from './queries';

interface Props {
  request: SlotRequestRow;
  busy: boolean;
  onApprove: (slotId: string) => Promise<void>;
  onDecline: (slotId: string, reason: string) => Promise<void>;
}

export default function SlotRequestCard({ request, busy, onApprove, onDecline }: Readonly<Props>) {
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState('');
  const fmt = useDateFormat();
  const { t } = useTranslation();
  // Whole-day and multi-day (activity) bookings label correctly through the
  // shared helper — a bare start-day + times would misread both.
  const slotWindow = (row: SlotRequestRow) =>
    slotSpanLabel(row.start_at, row.end_at, row.whole_day, fmt, t('shell.slots.wholeDay'));

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
          <Chip size="small" color="warning" label={t('partners.slotRequestsPage.awaitingDecision')} />
        </Stack>
        <Divider />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 1, md: 3 }}>
          <Detail label={t('partners.common.venue')} value={request.venue_name} />
          <Detail label={t('partners.slotRequestsPage.slot')} value={slotWindow(request)} />
          <Detail label={t('partners.slotRequestsPage.slotPrice')} value={request.price > 0 ? `₹${request.price.toLocaleString('en-IN')}` : 'Free'} />
          <Detail label={t('partners.slotRequestsPage.requested')} value={formatDateTime(request.requested_at)} />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 1, md: 3 }}>
          <Detail label={t('partners.common.host')} value={request.host_name || '—'} />
          <Detail
            label={t('shell.common.email')}
            value={request.host_email ? <Link href={`mailto:${request.host_email}`}>{request.host_email}</Link> : '—'}
          />
          <Detail
            label={t('shell.common.phone')}
            value={request.host_phone ? <Link href={`tel:${request.host_phone}`}>{request.host_phone}</Link> : '—'}
          />
        </Stack>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          {/* Same page the request email's buttons open — it shows what this
           * booking actually earns after Duncit's commission. */}
          <Button size="small" component={RouterLink} to={`/venues/requests/${request.slot_id}`}>
            View earnings
          </Button>
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
        <DialogTitle>{t('partners.slotRequestsPage.approveThisSlotBooking')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            "{request.pod_title}" will be confirmed for {slotWindow(request)} and the pod goes live immediately.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmApprove(false)}>{t('shell.common.cancel')}</Button>
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
        <DialogTitle>{t('partners.slotRequestsPage.declineThisSlotBooking')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              The slot opens up again and the host is notified that the request was declined.
            </Typography>
            <TextField
              label={t('partners.slotRequestsPage.reasonOptional')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              multiline
              minRows={2}
              inputProps={{ maxLength: 280 }}
              helperText={t('partners.slotRequestsPage.sharedWithTheHostSoThey')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeclineOpen(false)}>{t('shell.common.cancel')}</Button>
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
