import { useMemo } from 'react';
import { format } from 'date-fns';
import { Spinner, Text, YStack } from 'tamagui';
import { buildSlotLabels } from '@duncit/slots';
import {
  bookingCalendarProps,
  bookingSlotId,
  formatStatementMoney,
  venueBookingModelKey,
  type BookingTile,
} from '@duncit/utils';

import { SlotCalendar } from '@/components/slots';
import { VenuePricingModel } from '@/generated/graphql/graphql';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useInstantBooking } from '@/hooks/useInstantBooking';
import { useTranslation } from '@/hooks/useTranslation';
import { parseDateTimeText } from '../../create-pod.form';
import type { CreatePodForm } from '../../create-pod.types';
import { BookingEndPicker } from './BookingEndPicker';
import { BookingGuestFields } from './BookingGuestFields';
import { VenueQuoteCard, type VenueQuoteState } from './VenueQuoteCard';
import { VenueTermsCard } from './VenueTermsCard';

interface Props {
  form: CreatePodForm;
  venueId: string;
  /** The picked space, as the form stores it. */
  spaceLabel: string;
  quote: VenueQuoteState;
  currencySymbol: string;
}

const DIRTY = { shouldDirty: true, shouldValidate: true } as const;

function Notice({
  testID,
  text,
  tone,
}: Readonly<{ testID: string; text: string; tone: '$danger' | '$color' }>) {
  return (
    <YStack padding={12} borderRadius={14} backgroundColor="$soft">
      <Text testID={testID} role="alert" fontSize={13} fontWeight="500" color={tone}>
        {text}
      </Text>
    </YStack>
  );
}

/**
 * Book the venue at its own pricing: only its model's choices are shown — a
 * free slot (PER_SLOT), or a start and an end on the venue's grid inside its
 * opening hours (PER_HOUR, PER_PAX with guests, FLAT). Days the venue is shut,
 * or already booked through, cannot be picked. The window becomes the pod's
 * window and the server's quote shows below. mWeb twin: InstantBookingPicker.
 */
export function InstantBookingPicker({
  form,
  venueId,
  spaceLabel,
  quote,
  currencySymbol,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const booking = useInstantBooking(venueId, spaceLabel);
  const startIso = parseDateTimeText(form.watch('pod_date_time_text'))?.toISOString() ?? null;
  const endIso = parseDateTimeText(form.watch('pod_end_date_time_text'))?.toISOString() ?? '';
  const perSlot = booking.pricing?.model === VenuePricingModel.PerSlot;
  const labels = useMemo(() => {
    // The only whole-day tiles here are the days the venue closed itself.
    const base = {
      ...buildSlotLabels(t, 'mweb.slots'),
      wholeDay: t('mweb.createPod.venueTerms.closed'),
    };
    return perSlot ? base : { ...base, availableSlots: t('mweb.createPod.bookingStart') };
  }, [t, perSlot]);

  if (booking.pricingLoading)
    return <Spinner color="$primary" aria-label={t('mweb.a11y.loading')} />;
  if (booking.pricingFailed) {
    return (
      <Notice
        testID="create-pod-pricing-error"
        text={t('mweb.createPod.pricingLoadFailed')}
        tone="$danger"
      />
    );
  }
  if (!booking.pricing || !booking.configured) {
    return (
      <Notice
        testID="create-pod-pricing-not-set"
        text={t('mweb.createPod.pricingNotSet')}
        tone="$color"
      />
    );
  }
  const { pricing } = booking;

  // The schedule boxes are typed in the admin's pattern, so a window is
  // written back in that same shape (as a picked slot always was).
  const setWindow = (from: string, to: string | null) => {
    // A slot id an older draft carried no longer applies once a window is picked.
    form.setValue('venue_slot_id', '', { shouldDirty: true });
    form.setValue('pod_date_time_text', format(new Date(from), fmt.dateTimeInputFormat), DIRTY);
    form.setValue(
      'pod_end_date_time_text',
      to ? format(new Date(to), fmt.dateTimeInputFormat) : '',
      DIRTY,
    );
  };
  const pick = (tile: BookingTile) =>
    setWindow(tile.start_at, perSlot ? tile.end_at : (booking.endsFor(tile.start_at)[0] ?? null));
  const ends = perSlot ? [] : booking.endsFor(startIso);
  const selectedId =
    perSlot && startIso && endIso ? bookingSlotId(startIso, endIso) : (startIso ?? '');
  const errors = form.formState.errors;
  // With no start picked, the (hidden) start box's typed-format error would
  // read as nonsense under a calendar: ask for a time instead.
  const timeError = startIso
    ? (errors.pod_date_time_text?.message ?? errors.pod_end_date_time_text?.message)
    : errors.pod_date_time_text && t('mweb.createPod.validation.bookingRequired');

  return (
    <YStack gap={16} testID="create-pod-instant-booking">
      <Text testID="create-pod-booking-model" fontSize={13} fontWeight="600" color="$muted">
        {t(venueBookingModelKey(pricing.model))}
      </Text>
      {startIso ? null : <VenueTermsCard pricing={pricing} currencySymbol={currencySymbol} />}
      <BookingGuestFields form={form} pricing={pricing} />
      {booking.calendarFailed ? (
        <Notice
          testID="create-pod-calendar-error"
          text={t('mweb.createPod.calendarLoadFailed')}
          tone="$danger"
        />
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
            money: (value) => formatStatementMoney(value, currencySymbol),
          })}
          fmt={fmt}
          labels={labels}
        />
      )}
      {!perSlot && startIso ? (
        <BookingEndPicker ends={ends} endIso={endIso} onPick={(end) => setWindow(startIso, end)} />
      ) : null}
      <VenueQuoteCard {...quote} currencySymbol={currencySymbol} />
    </YStack>
  );
}
