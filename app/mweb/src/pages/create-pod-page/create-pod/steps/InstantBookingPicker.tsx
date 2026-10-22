import { useMemo } from 'react';
import { Alert, Chip, CircularProgress, MenuItem, Stack, TextField } from '@mui/material';
import { buildSlotLabels } from '@duncit/slots';
import { SlotCalendar } from '@duncit/slots/mui';
import {
  bookingCalendarProps,
  bookingSlotId,
  formatStatementMoney,
  venueBookingModelKey,
  type BookingTile,
  type SpotsBounds,
} from '@duncit/utils';
import { usePricing } from '../../../../hooks/usePricing';
import { useDateFormat } from '../../../../utils/dateFormat';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { CreatePodForm } from '../create-pod.types';
import { useVenueQuote } from '../useVenueQuote';
import BookingGuestFields from './BookingGuestFields';
import { useInstantBooking } from './useInstantBooking';
import VenueQuoteCard from './VenueQuoteCard';
import VenueTermsCard from './VenueTermsCard';

interface Props {
  form: CreatePodForm;
  venueId: string;
  /** The picked space, as the form stores it. */
  spaceLabel: string;
  /** The range the pod's spots (= the booking's guests) may take. */
  spots: SpotsBounds;
}

const DIRTY = { shouldDirty: true, shouldValidate: true } as const;

/**
 * Book the venue at its own pricing: only its model's choices are shown — a
 * free slot (PER_SLOT), or a start and an end on the venue's grid inside its
 * opening hours (PER_HOUR, PER_PAX with guests, FLAT). Days the venue is shut,
 * or already booked through, cannot be picked. The window becomes the pod's
 * window and the server's quote shows below. Native twin: InstantBookingPicker.
 */
export default function InstantBookingPicker({ form, venueId, spaceLabel, spots }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const { currency } = usePricing();
  const booking = useInstantBooking(venueId, spaceLabel);
  const quote = useVenueQuote(form);
  const start = form.watch('pod_date_time');
  const end = form.watch('pod_end_date_time');
  const startIso = start ? start.toISOString() : null;
  const endIso = end ? end.toISOString() : '';
  const perSlot = booking.pricing?.model === 'PER_SLOT';
  const labels = useMemo(() => {
    // The only whole-day tiles here are the days the venue closed itself.
    const base = { ...buildSlotLabels(t, 'mweb.slots'), wholeDay: t('mweb.createPod.venueTerms.closed') };
    return perSlot ? base : { ...base, availableSlots: t('mweb.createPod.bookingStart') };
  }, [t, perSlot]);

  if (booking.pricingLoading) return <CircularProgress size={22} aria-label={t('mweb.a11y.loading')} />;
  if (booking.pricingError) {
    return <Alert severity="error" data-testid="create-pod-pricing-error">{t('mweb.createPod.pricingLoadFailed')}</Alert>;
  }
  if (!booking.pricing?.model || !booking.configured) {
    return <Alert severity="warning" data-testid="create-pod-pricing-not-set">{t('mweb.createPod.pricingNotSet')}</Alert>;
  }
  const { pricing } = booking;

  const setWindow = (from: string, to: string | null) => {
    // A slot id an older draft carried no longer applies once a window is picked.
    form.setValue('venue_slot_id', '', { shouldDirty: true });
    form.setValue('pod_date_time', new Date(from), DIRTY);
    form.setValue('pod_end_date_time', to ? new Date(to) : null, DIRTY);
  };
  const pick = (tile: BookingTile) =>
    setWindow(tile.start_at, perSlot ? tile.end_at : (booking.endsFor(tile.start_at)[0] ?? null));
  const ends = perSlot ? [] : booking.endsFor(startIso);
  const selectedId = perSlot && startIso && endIso ? bookingSlotId(startIso, endIso) : (startIso ?? '');
  const timeError = form.formState.errors.pod_date_time?.message ?? form.formState.errors.pod_end_date_time?.message;

  return (
    <Stack spacing={2} data-testid="create-pod-instant-booking">
      <Chip
        size="small"
        variant="outlined"
        label={t(venueBookingModelKey(pricing.model))}
        data-testid="create-pod-booking-model"
        sx={{ alignSelf: 'flex-start' }}
      />
      {!startIso && <VenueTermsCard pricing={pricing} />}
      <BookingGuestFields form={form} pricing={pricing} spots={spots} />
      {booking.calendarError ? (
        <Alert severity="error" data-testid="create-pod-calendar-error">{t('mweb.createPod.calendarLoadFailed')}</Alert>
      ) : (
        <SlotCalendar
          {...bookingCalendarProps({
            tiles: booking.tiles,
            loading: booking.calendarLoading,
            error: timeError,
            selectedId,
            onPick: pick,
            model: pricing.model,
            t,
            money: (value) => formatStatementMoney(value, currency),
          })}
          fmt={fmt}
          labels={labels}
        />
      )}
      {!perSlot && startIso && (
        <TextField
          select
          fullWidth
          data-testid="create-pod-booking-end"
          label={t('mweb.createPod.bookingEnd')}
          value={ends.includes(endIso) ? endIso : ''}
          onChange={(e) => setWindow(startIso, e.target.value)}
          helperText={ends.length ? t('mweb.createPod.bookingEndHint') : t('mweb.createPod.bookingNoEnd')}
          error={ends.length === 0}
        >
          {ends.map((option) => (
            <MenuItem key={option} value={option}>{fmt.formatTime(option)}</MenuItem>
          ))}
        </TextField>
      )}
      <VenueQuoteCard quote={quote.quote} loading={quote.loading} error={quote.error} />
    </Stack>
  );
}
