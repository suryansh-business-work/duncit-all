import { Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../../i18n/useTranslation';
import type { SeriesBooking } from './useSeriesBooking';
import BookingClashDialog from '../clash/BookingClashDialog';
import SeriesDatePickList from './SeriesDatePickList';

interface Props {
  series: SeriesBooking;
  isFree: boolean;
  priceFormat: (amount: number) => string;
}

/**
 * Book a recurring pod: tick the dates (or select all), each at its own price,
 * with what that costs, the multi-date discount included. The checkout prices
 * it again on the server; this is the preview.
 */
export default function SeriesBookingDialog({ series, isFree, priceFormat }: Readonly<Props>) {
  const { t } = useTranslation();
  const count = series.chosen.length;
  const { estimate } = series;
  return (
    <>
    <Dialog
      open={series.open}
      onClose={series.busy ? undefined : () => series.setOpen(false)}
      fullWidth
      maxWidth="sm"
      data-testid="series-booking-dialog"
    >
      <DialogTitle>{t('mweb.podSeriesBooking.pickTitle')}</DialogTitle>
      <DialogContent dividers>
        {series.openRows.length === 0 ? (
          <Typography variant="body2" data-testid="series-booking-none">
            {t('mweb.podSeriesBooking.noneOpen')}
          </Typography>
        ) : (
          <SeriesDatePickList series={series} isFree={isFree} priceFormat={priceFormat} />
        )}
        {!isFree && count > 0 && (
          <Stack spacing={0.5} sx={{ mt: 2 }} data-testid="series-booking-estimate" aria-live="polite">
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
    {/* Every Book on Pod Details goes through this hook, recurring or not — so
        the time-clash prompt lives beside its date picker. */}
    <BookingClashDialog guard={series.clash} />
    </>
  );
}
