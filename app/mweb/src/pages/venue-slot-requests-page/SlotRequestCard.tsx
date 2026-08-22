import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { SlotRequestRow } from './queries';
import { podSummary, requestedAt, slotPrice, slotWindow } from './slot-request';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  request: SlotRequestRow;
  busy: boolean;
  onApprove: (slotId: string) => void;
  onDecline: (slotId: string, reason: string) => void;
}

function Detail({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" component="div" sx={{ wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  );
}

/**
 * One host asking to run their pod at your venue.
 *
 * Declining takes a reason, and approving asks once — a pod goes live the
 * moment you say yes, so neither is a button to nudge by accident.
 */
export default function SlotRequestCard({ request, busy, onApprove, onDecline }: Readonly<Props>) {
  const { t } = useTranslation();
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState('');

  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={800} noWrap>
              {request.pod_title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {podSummary(request)}
            </Typography>
          </Box>
          <Chip size="small" color="warning" label={t('mweb.venueSlotRequests.awaitingDecision')} />
        </Stack>

        <Divider />

        <Stack spacing={1}>
          <Detail label={t('mweb.common.venue')} value={request.venue_name} />
          <Detail label={t('mweb.venueSlotRequests.slot')} value={slotWindow(request)} />
          <Detail label={t('mweb.venueSlotRequests.slotPrice')} value={slotPrice(request.price)} />
          <Detail label={t('mweb.venueSlotRequests.requested')} value={requestedAt(request.requested_at)} />
          <Detail label={t('mweb.venueSlotRequests.host')} value={request.host_name || '—'} />
          <Detail
            label={t('mweb.venueSlotRequests.contact')}
            value={
              <>
                {request.host_email ? (
                  <Link href={`mailto:${request.host_email}`}>{request.host_email}</Link>
                ) : (
                  '—'
                )}
                {request.host_phone ? (
                  <>
                    {' · '}
                    <Link href={`tel:${request.host_phone}`}>{request.host_phone}</Link>
                  </>
                ) : null}
              </>
            }
          />
        </Stack>

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            size="small"
            color="error"
            startIcon={<CancelIcon />}
            disabled={busy}
            onClick={() => setDeclineOpen(true)}
          >
            Decline
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<CheckCircleIcon />}
            disabled={busy}
            onClick={() => setConfirmApprove(true)}
          >
            Approve
          </Button>
        </Stack>
      </Stack>

      <Dialog open={confirmApprove} onClose={() => setConfirmApprove(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('mweb.venueSlotRequests.approveThisBooking')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {request.pod_title} goes live at {request.venue_name} for {slotWindow(request)}. The host
            and everyone who joins will be told.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmApprove(false)}>{t('mweb.common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={() => {
              setConfirmApprove(false);
              onApprove(request.slot_id);
            }}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={declineOpen} onClose={() => setDeclineOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('mweb.venueSlotRequests.declineThisBooking')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            The slot opens again and the host is told. A reason helps them ask better next time.
          </Typography>
          <TextField
            fullWidth
            size="small"
            multiline
            minRows={2}
            label={t('mweb.common.reasonOptional')}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeclineOpen(false)}>{t('mweb.common.cancel')}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setDeclineOpen(false);
              onDecline(request.slot_id, reason.trim());
              setReason('');
            }}
          >
            Decline
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
