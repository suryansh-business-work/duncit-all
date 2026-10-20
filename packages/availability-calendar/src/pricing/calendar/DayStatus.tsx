import { Chip, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { closedReasonLabel, rupees } from '../format';
import type { BookingDay, VenuePricingModel } from '../types';

interface Props {
  day: BookingDay | undefined;
  model: VenuePricingModel | null | undefined;
}

/**
 * What the day looks like to a host: closed (and why), its opening window,
 * a per-slot venue's slots with which are still free, and what is booked —
 * all read-only, straight from `venueBookingCalendar`.
 */
export default function DayStatus({ day, model }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat({ timeZoneAware: true });
  if (!day) return null;

  return (
    <Stack spacing={1} data-testid="pricing-day-status">
      {day.closed_reason ? (
        <Chip color="default" label={closedReasonLabel(t, day.closed_reason)} sx={{ alignSelf: 'flex-start' }} />
      ) : null}
      {!day.closed_reason && model !== 'PER_SLOT' && day.open && day.close ? (
        <Typography variant="body2">
          {t('venuePricing.day.openWindow', { vars: { open: fmt.formatTime(day.open), close: fmt.formatTime(day.close) } })}
        </Typography>
      ) : null}
      {model === 'PER_SLOT' && day.slots.length > 0 ? (
        <Stack spacing={0.75}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 900 }}>
            {t('venuePricing.day.slots')}
          </Typography>
          {day.slots.map((slot) => (
            <Stack key={slot.start} direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2">
                {`${fmt.formatTime(slot.start)} – ${fmt.formatTime(slot.end)} · ${rupees(slot.price)}`}
              </Typography>
              <Chip
                size="small"
                color={slot.available ? 'success' : 'warning'}
                label={slot.available ? t('venuePricing.day.slotFree') : t('venuePricing.day.slotTaken')}
              />
            </Stack>
          ))}
        </Stack>
      ) : null}
      {day.busy.length > 0 ? (
        <Stack spacing={0.5}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 900 }}>
            {t('venuePricing.day.booked')}
          </Typography>
          {day.busy.map((busy) => (
            <Typography key={busy.start} variant="body2">
              {`${fmt.formatTime(busy.start)} – ${fmt.formatTime(busy.end)}`}
            </Typography>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}
