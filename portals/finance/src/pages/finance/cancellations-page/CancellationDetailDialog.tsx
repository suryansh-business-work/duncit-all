import {
  Alert,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { InfoRow, StatusChip } from '@duncit/ui';
import { fmtDate, KIND_COLORS, KIND_LABELS, money, type PodCancellationRow } from './queries';
import { useTranslation } from '@duncit/app-settings';

function Row({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return <InfoRow variant="split" label={label} value={value} sx={{ py: 0.5 }} />;
}

interface Props {
  row: PodCancellationRow | null;
  onClose: () => void;
}

/** Full picture of one cancellation: who cancelled and why, what the
 * attendees got back, and what the booking was worth to the venue. */
export default function CancellationDetailDialog({ row, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={!!row} onClose={onClose} maxWidth="sm" fullWidth>
      {row && (
        <>
          <DialogTitle sx={{ fontWeight: 800 }}>
            {row.pod_title}
            <StatusChip
              status={row.kind}
              label={`Cancelled by ${KIND_LABELS[row.kind]}`}
              colorMap={KIND_COLORS}
              sx={{ ml: 1.5 }}
            />
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{
                    fontWeight: 800
                  }}>
                    Cancellation
                  </Typography>
                  <Row label={t('finance.cancellations.cancelledBy')} value={row.actor_name || KIND_LABELS[row.kind]} />
                  <Row label={t('finance.common.reason')} value={row.reason || '—'} />
                  <Row label={t('finance.cancellations.cancelledAt')} value={fmtDate(row.cancelled_at)} />
                  <Row label={t('finance.cancellations.podWasScheduledFor')} value={fmtDate(row.pod_date_time)} />
                  <Row label={t('finance.common.hosts')} value={row.host_names.join(', ') || '—'} />
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{
                    fontWeight: 800
                  }}>
                    Attendee refunds
                  </Typography>
                  <Row label={t('finance.cancellations.attendeesOnThePod')} value={row.attendee_count} />
                  <Row
                    label={t('finance.cancellations.refunded')}
                    value={`${money(row.currency_symbol, row.refunded_total)} (${row.refunded_count} payments)`}
                  />
                  <Row
                    label={t('finance.cancellations.notRefunded')}
                    value={`${money(row.currency_symbol, row.unrefunded_total)} (${row.unrefunded_count} payments)`}
                  />
                  {row.unrefunded_count > 0 && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      Successful payments are still unrefunded — review them in Payment Logs
                      (filter by this pod).
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{
                    fontWeight: 800
                  }}>
                    Venue
                  </Typography>
                  {row.venue_id ? (
                    <>
                      <Row label={t('finance.common.venue')} value={row.venue_name ?? '—'} />
                      <Row
                        label={t('finance.cancellations.bookedSlotValue')}
                        value={money(row.currency_symbol, row.venue_amount)}
                      />
                      <Typography variant="caption" sx={{
                        color: "text.secondary"
                      }}>
                        The venue's money for this booking — lost when the pod was cancelled.
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" sx={{
                      color: "text.secondary"
                    }}>
                      This pod had no venue booking.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>{t('shell.common.close')}</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
