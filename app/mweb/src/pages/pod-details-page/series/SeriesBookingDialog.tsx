import {
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { bookableSeriesDates, SERIES_BOOKING_CHOICES, type SeriesBookingChoice } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import { formatDateTime } from '../../../utils/dateFormat';
import type { SeriesBooking } from './useSeriesBooking';

interface Props {
  series: SeriesBooking;
  isFree: boolean;
  priceFormat: (amount: number) => string;
}

/**
 * Book a recurring pod: the next date, every date, or a hand-picked set —
 * with what that costs, the multi-date discount included. The checkout prices
 * it again on the server; this is the preview.
 */
export default function SeriesBookingDialog({ series, isFree, priceFormat }: Readonly<Props>) {
  const { t } = useTranslation();
  const open = bookableSeriesDates(series.rows);
  const count = series.chosen.length;
  const { estimate } = series;
  return (
    <Dialog
      open={series.open}
      onClose={series.busy ? undefined : () => series.setOpen(false)}
      fullWidth
      maxWidth="sm"
      data-testid="series-booking-dialog"
    >
      <DialogTitle>{t('mweb.podSeriesBooking.pickTitle')}</DialogTitle>
      <DialogContent dividers>
        {open.length === 0 ? (
          <Typography variant="body2" data-testid="series-booking-none">
            {t('mweb.podSeriesBooking.noneOpen')}
          </Typography>
        ) : (
          <RadioGroup
            value={series.choice}
            onChange={(event) => series.setChoice(event.target.value as SeriesBookingChoice)}
            aria-label={t('mweb.podSeriesBooking.pickTitle')}
          >
            {SERIES_BOOKING_CHOICES.map((option) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio data-testid={`series-booking-choice-${option.value}`} />}
                label={t(option.labelKey, { count: open.length })}
              />
            ))}
          </RadioGroup>
        )}
        {series.choice === 'PICK' && (
          <Stack sx={{ pl: 4 }} data-testid="series-booking-pick-list">
            {open.map((row) => (
              <FormControlLabel
                key={row.pod_doc_id}
                control={
                  <Checkbox
                    checked={series.picked.includes(row.pod_doc_id)}
                    onChange={() => series.togglePicked(row.pod_doc_id)}
                    data-testid={`series-booking-pick-${row.pod_doc_id}`}
                  />
                }
                label={formatDateTime(row.start_at)}
              />
            ))}
          </Stack>
        )}
        {!isFree && count > 0 && (
          <Stack spacing={0.5} sx={{ mt: 2 }} data-testid="series-booking-estimate">
            <Typography variant="body2">
              {t('mweb.podSeriesBooking.datesCount', { count })} · {priceFormat(estimate.gross)}
            </Typography>
            {estimate.discount > 0 && (
              <Typography variant="body2" sx={{ color: 'success.main' }}>
                {t('mweb.podSeriesBooking.discountRow', { vars: { pct: estimate.pct, count } })} − {priceFormat(estimate.discount)}
              </Typography>
            )}
            <Typography sx={{ fontWeight: 600 }}>
              {t('mweb.podSeriesBooking.estimateTotal', { vars: { amount: priceFormat(estimate.total) } })}
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <DuncitButton onClick={() => series.setOpen(false)} disabled={series.busy} data-testid="series-booking-cancel">
          {t('mweb.podDetails.close')}
        </DuncitButton>
        <DuncitButton
          variant="contained"
          onClick={series.confirm}
          disabled={series.busy || count === 0}
          data-testid="series-booking-confirm"
        >
          {isFree ? t('mweb.podSeriesBooking.joinDates', { count }) : t('mweb.podSeriesBooking.continue')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
