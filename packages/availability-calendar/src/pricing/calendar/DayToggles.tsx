import { FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  blocked: boolean;
  holiday: boolean;
  busy: boolean;
  /** Something is booked that day — closing it would not cancel that booking. */
  hasBookings: boolean;
  onBlocked: (next: boolean) => void;
  onHoliday: (next: boolean) => void;
}

/** Close one date to new bookings: a pricing block, or a venue holiday (the venue's settings). */
export default function DayToggles({ blocked, holiday, busy, hasBookings, onBlocked, onHoliday }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={0.5}>
      <FormControlLabel
        control={
          <Switch checked={blocked} disabled={busy} onChange={(e) => onBlocked(e.target.checked)} data-testid="pricing-day-block" />
        }
        label={t('venuePricing.day.block')}
      />
      <FormControlLabel
        control={
          <Switch checked={holiday} disabled={busy} onChange={(e) => onHoliday(e.target.checked)} data-testid="pricing-day-holiday" />
        }
        label={t('venuePricing.day.holiday')}
      />
      {hasBookings && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('venuePricing.day.bookingsKept')}
        </Typography>
      )}
    </Stack>
  );
}
