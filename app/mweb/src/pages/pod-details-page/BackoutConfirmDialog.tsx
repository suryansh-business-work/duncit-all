import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import PolicyRenderer from '../../components/PolicyRenderer';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (seats: number) => void;
  busy?: boolean;
  /** Estimated refund after the Backouts deduction (null for free bookings). */
  refundAmount?: number | null;
  /** Refund for ONE seat after the deduction — prices a partial release. */
  refundPerSeat?: number | null;
  /** Seats this booking holds. More than one offers a partial release. */
  mySeats?: number;
  /** Currency symbol for the refund line (from public finance settings). */
  currency?: string;
  /** Backouts deduction % applied to the refund estimate. */
  deductionPct?: number;
}

const money = (n: number) => Math.round(n * 100) / 100;

/**
 * Confirmation dialog shown before a user backs out of a pod. Confirming moves
 * the booking to "Backout in process": the seat is released and the refund is
 * paid only once someone fills the spot. Renders the admin-managed
 * "backout-terms" policy inline so users see the live terms before confirming.
 */
export default function BackoutConfirmDialog({
  open,
  onClose,
  onConfirm,
  busy,
  refundAmount = null,
  refundPerSeat = null,
  mySeats = 1,
  currency = '₹',
  deductionPct = 0,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const held = Math.max(1, Math.floor(mySeats) || 1);
  // Default to releasing everything — that is what Backout meant before a
  // booking could cover several people, and it stays the common case.
  const [seats, setSeats] = useState(held);
  useEffect(() => {
    if (open) setSeats(held);
  }, [open, held]);

  // Per-seat is already net of the deduction, so the estimate scales with the
  // chosen count. Releasing everything uses the server's own total, which is
  // the figure of record.
  const releasing = Math.min(seats, held);
  const partial = releasing < held;
  const estimate = partial && refundPerSeat != null ? money(refundPerSeat * releasing) : refundAmount;
  const kept = held - releasing;
  const keptKey = kept === 1 ? 'mweb.podDetails.keepSeatsOne' : 'mweb.podDetails.keepSeatsMany';
  const partialHint = t(keptKey, { vars: { count: kept } });
  const keptHint = partial ? partialHint : t('mweb.podDetails.releasingAll');
  const estimateKey =
    releasing === 1 ? 'mweb.podDetails.refundEstimateOne' : 'mweb.podDetails.refundEstimateMany';
  const estimateLine = t(estimateKey, {
    vars: { amount: `${currency}${estimate}`, count: releasing, pct: deductionPct },
  });

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>{t('mweb.podDetails.backoutTitle')}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5 }}>
          {t('mweb.podDetails.backoutRefundOnlyIfFilled')}
        </Typography>
        {held > 1 && (
          <TextField
            select
            fullWidth
            size="small"
            label={t('mweb.podDetails.seatsToRelease')}
            value={releasing}
            onChange={(event) => setSeats(Number(event.target.value))}
            disabled={busy}
            helperText={keptHint}
            sx={{ mb: 2 }}
          >
            {Array.from({ length: held }, (_, index) => index + 1).map((count) => (
              <MenuItem key={count} value={count}>
                {t('mweb.podDetails.seatsOfHeld', { vars: { count, held } })}
              </MenuItem>
            ))}
          </TextField>
        )}
        {estimate != null && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {estimateLine}
          </Alert>
        )}
        <Box sx={{ maxHeight: 280, overflowY: 'auto', pr: 1 }}>
          <PolicyRenderer slug="backout-terms" hideTitle hideUpdated />
        </Box>

        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary">
          {t('mweb.podDetails.readTheFull')}{' '}
          <Link
            component={RouterLink}
            to="/policies/backout-terms"
            onClick={onClose}
            underline="hover"
          >
            {t('mweb.podDetails.backoutTerms')}
          </Link>
          .
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          {t('mweb.podDetails.close')}
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => onConfirm(releasing)}
          disabled={busy}
        >
          {busy ? t('mweb.podDetails.backingOut') : t('mweb.podDetails.confirmBackout')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
