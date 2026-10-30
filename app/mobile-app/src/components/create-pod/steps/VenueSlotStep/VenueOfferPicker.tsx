import { useMemo } from 'react';
import { format } from 'date-fns';
import { Text, YStack } from 'tamagui';
import { buildSlotLabels } from '@duncit/slots';
import {
  bookingCalendarProps,
  formatStatementMoney,
  isFreeVenueOfferModel,
  type BookingTile,
  type SpotsBounds,
} from '@duncit/utils';

import { SlotCalendar } from '@/components/slots';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useOfferCalendar } from '@/hooks/useOfferCalendar';
import { useTranslation } from '@/hooks/useTranslation';
import { parseDateTimeText } from '../../create-pod.form';
import type { CreatePodForm } from '../../create-pod.types';
import { FREE_JUSTIFICATION_NAMES, FreeArrangementFields } from '../../free-arrangement';
import { BookingEndPicker } from './BookingEndPicker';
import { BookingGuestFields } from './BookingGuestFields';
import { OfferAskFields } from './OfferAskFields';
import { OfferTermsFields } from './OfferTermsFields';
import { VenueQuoteCard, type VenueQuoteState } from './VenueQuoteCard';

interface Props {
  form: CreatePodForm;
  venueId: string;
  /** The picked space, as the form stores it. */
  spaceLabel: string;
  quote: VenueQuoteState;
  currencySymbol: string;
  /** The range the pod's spots (= the offer's guests) may take. */
  spots: SpotsBounds;
  /** The fewest guests the venue takes an offer for (0 = none). */
  minGuests: number;
}

const DIRTY = { shouldDirty: true, shouldValidate: true } as const;

/**
 * Offer the venue a booking: a start and an end inside its opening hours (days
 * it is shut, or times already booked, cannot be picked), the guests from the
 * venue's minimum, how the host will pay it with an amount, and what they need
 * from the venue. The window becomes the pod's window, the server prices the
 * offer below at both ends of the guests, and the venue accepts, rejects or
 * counters it once the pod is sent. mWeb twin: VenueOfferPicker.
 */
export function VenueOfferPicker({
  form,
  venueId,
  spaceLabel,
  quote,
  currencySymbol,
  spots,
  minGuests,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const calendar = useOfferCalendar(venueId, spaceLabel);
  const startIso = parseDateTimeText(form.watch('pod_date_time_text'))?.toISOString() ?? null;
  const endIso = parseDateTimeText(form.watch('pod_end_date_time_text'))?.toISOString() ?? '';
  const labels = useMemo(
    // The only whole-day tiles here are the days the venue closed itself.
    () => ({
      ...buildSlotLabels(t, 'mweb.slots'),
      wholeDay: t('mweb.createPod.venueTerms.closed'),
      availableSlots: t('mweb.createPod.bookingStart'),
    }),
    [t],
  );

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
    setWindow(tile.start_at, calendar.endsFor(tile.start_at)[0] ?? null);
  const errors = form.formState.errors;
  // A free venue asks no amount: the host says why it is free instead.
  const freeVenue = isFreeVenueOfferModel(form.watch('venue_offer_model'));
  // With no start picked, the (hidden) start box's typed-format error would
  // read as nonsense under a calendar: ask for a time instead.
  const timeError = startIso
    ? (errors.pod_date_time_text?.message ?? errors.pod_end_date_time_text?.message)
    : errors.pod_date_time_text && t('mweb.createPod.validation.bookingRequired');

  return (
    <YStack gap={16} testID="create-pod-venue-offer">
      <Text testID="create-pod-offer-intro" fontSize={13} color="$muted">
        {t('mweb.createPod.offer.intro')}
      </Text>
      <BookingGuestFields form={form} spots={spots} minGuests={minGuests} />
      {calendar.failed ? (
        <Text testID="create-pod-calendar-error" role="alert" fontSize={13} color="$danger">
          {t('mweb.createPod.calendarLoadFailed')}
        </Text>
      ) : (
        <SlotCalendar
          {...bookingCalendarProps({
            tiles: calendar.tiles,
            loading: calendar.loading,
            error: timeError,
            selectedId: startIso ?? '',
            onPick: pick,
            model: null,
            t,
            money: (value) => formatStatementMoney(value, currencySymbol),
          })}
          fmt={fmt}
          labels={labels}
        />
      )}
      {startIso ? (
        <BookingEndPicker
          ends={calendar.endsFor(startIso)}
          endIso={endIso}
          onPick={(end) => setWindow(startIso, end)}
        />
      ) : null}
      <Text fontSize={14} fontWeight="700" color="$color">
        {t('mweb.createPod.offer.title')}
      </Text>
      <OfferTermsFields form={form} />
      {freeVenue ? (
        <FreeArrangementFields
          control={form.control}
          names={FREE_JUSTIFICATION_NAMES}
          testIDPrefix="create-pod-venue"
        />
      ) : null}
      <OfferAskFields
        control={form.control}
        offeringsName="venue_offer_offerings"
        noteName="venue_offer_note"
      />
      <VenueQuoteCard {...quote} currencySymbol={currencySymbol} free={freeVenue} />
    </YStack>
  );
}
