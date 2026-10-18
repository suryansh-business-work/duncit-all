import { Link as RouterLink } from 'react-router';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Link, Stack, Typography } from '@mui/material';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../../i18n/useTranslation';
import { formatDateTime, formatTime } from '../../../utils/dateFormat';
import { podUrl } from '../../../utils/seoUrls';
import type { BookingClashGuard } from './useBookingClashGuard';

interface Props {
  guard: Pick<BookingClashGuard, 'pods' | 'answer'>;
}

/**
 * "You already have a pod at this time": every booked pod that overlaps, each
 * linked so the member can free that spot, then Force book or Cancel booking.
 * Opening a clashing pod cancels this booking — the member is leaving to sort
 * out the other one first.
 */
export default function BookingClashDialog({ guard }: Readonly<Props>) {
  const { t } = useTranslation();
  const { pods, answer } = guard;
  const count = pods.length;
  return (
    <Dialog
      open={count > 0}
      onClose={() => answer(false)}
      fullWidth
      maxWidth="sm"
      aria-labelledby="booking-clash-title"
      data-testid="booking-clash-dialog"
    >
      <DialogTitle id="booking-clash-title">{t('mweb.bookingClash.title', { count })}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2">{t('mweb.bookingClash.intro')}</Typography>
          <Stack component="ul" spacing={1.5} sx={{ listStyle: 'none', m: 0, p: 0 }} data-testid="booking-clash-list">
            {pods.map((pod) => {
              const href = podUrl(pod.club_slug, pod.pod_slug);
              return (
                <Stack component="li" key={pod.pod_id} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                  <EventBusyRoundedIcon color="warning" aria-hidden sx={{ mt: 0.25 }} />
                  <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{pod.pod_title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('mweb.bookingClash.when', {
                        vars: { start: formatDateTime(pod.pod_date_time), end: formatTime(pod.pod_end_date_time) },
                      })}
                    </Typography>
                    {href !== '/' && (
                      <Link
                        component={RouterLink}
                        to={href}
                        variant="body2"
                        onClick={() => answer(false)}
                        data-testid={`booking-clash-open-${pod.pod_id}`}
                      >
                        {t('mweb.bookingClash.openPod')}
                      </Link>
                    )}
                  </Stack>
                </Stack>
              );
            })}
          </Stack>
          <Alert severity="info" data-testid="booking-clash-advice">
            {t('mweb.bookingClash.advice')}
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <DuncitButton onClick={() => answer(false)} data-testid="booking-clash-cancel">
          {t('mweb.bookingClash.cancelBooking')}
        </DuncitButton>
        <DuncitButton variant="contained" onClick={() => answer(true)} data-testid="booking-clash-force">
          {t('mweb.bookingClash.forceBook')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
