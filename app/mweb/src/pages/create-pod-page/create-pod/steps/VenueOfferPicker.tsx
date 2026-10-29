import { useMemo } from 'react';
import { Alert, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { FreeArrangementFields, VenueOfferAskFields } from '@duncit/forms';
import { buildSlotLabels } from '@duncit/slots';
import { SlotCalendar } from '@duncit/slots/mui';
import {
  VENUE_OFFER_ASK_LIMITS,
  bookingCalendarProps,
  formatStatementMoney,
  isFreeVenueOfferModel,
  type BookingTile,
  type SpotsBounds,
} from '@duncit/utils';
import { requiredLabel } from '../../../../forms/components/requiredLabel';
import { usePricing } from '../../../../hooks/usePricing';
import { useDateFormat } from '../../../../utils/dateFormat';
import { useTranslation } from '../../../../i18n/useTranslation';
import { FREE_JUSTIFICATION_NAMES, type CreatePodForm } from '../create-pod.types';
import { useOfferQuote } from '../useOfferQuote';
import BookingGuestFields from './BookingGuestFields';
import OfferTermsFields from './OfferTermsFields';
import { useOfferCalendar } from './useOfferCalendar';
import VenueQuoteCard from './VenueQuoteCard';

interface Props {
  form: CreatePodForm;
  venueId: string;
  /** The picked space, as the form stores it. */
  spaceLabel: string;
  /** The range the pod's spots (= the booking's guests) may take. */
  spots: SpotsBounds;
  /** The fewest guests the venue takes an offer for (0 = none). */
  minGuests?: number;
}

const DIRTY = { shouldDirty: true, shouldValidate: true } as const;

/**
 * Offer the venue a booking: a start and an end inside its opening hours (days
 * it is shut, or times already booked, cannot be picked), the guests from the
 * venue's minimum, how the host will pay it with an amount, and what they need
 * from the venue. The window becomes the pod's window, the server prices the
 * offer below at both ends of the guests, and the venue accepts, rejects or
 * counters it once the pod is sent. Asking for the venue free adds Duncit's free
 * policy, why it is free and the host's acceptance; the venue then only accepts
 * or declines. Native twin: VenueOfferPicker.
 */
export default function VenueOfferPicker({ form, venueId, spaceLabel, spots, minGuests = 0 }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const { currency } = usePricing();
  const calendar = useOfferCalendar(venueId, spaceLabel);
  const quote = useOfferQuote(form);
  const start = form.watch('pod_date_time');
  const end = form.watch('pod_end_date_time');
  const freeVenue = isFreeVenueOfferModel(form.watch('venue_offer_model'));
  const startIso = start ? start.toISOString() : null;
  const endIso = end ? end.toISOString() : '';
  const labels = useMemo(
    // The only whole-day tiles here are the days the venue closed itself.
    () => ({
      ...buildSlotLabels(t, 'mweb.slots'),
      wholeDay: t('mweb.createPod.venueTerms.closed'),
      availableSlots: t('mweb.createPod.bookingStart'),
    }),
    [t]
  );

  const setWindow = (from: string, to: string | null) => {
    // A slot id an older draft carried no longer applies once a window is picked.
    form.setValue('venue_slot_id', '', { shouldDirty: true });
    form.setValue('pod_date_time', new Date(from), DIRTY);
    form.setValue('pod_end_date_time', to ? new Date(to) : null, DIRTY);
  };
  const pick = (tile: BookingTile) => setWindow(tile.start_at, calendar.endsFor(tile.start_at)[0] ?? null);
  const ends = calendar.endsFor(startIso);
  const timeError = form.formState.errors.pod_date_time?.message ?? form.formState.errors.pod_end_date_time?.message;

  return (
    <Stack spacing={2} data-testid="create-pod-venue-offer">
      <Alert severity="info" data-testid="create-pod-offer-intro">
        {t('mweb.createPod.offer.intro')}
      </Alert>
      <BookingGuestFields form={form} spots={spots} minGuests={minGuests} />
      {calendar.error ? (
        <Alert severity="error" data-testid="create-pod-calendar-error">{t('mweb.createPod.calendarLoadFailed')}</Alert>
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
            money: (value) => formatStatementMoney(value, currency),
          })}
          fmt={fmt}
          labels={labels}
        />
      )}
      {startIso && (
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
      <Typography variant="subtitle2" component="h3">{t('mweb.createPod.offer.title')}</Typography>
      <OfferTermsFields form={form} />
      {freeVenue && (
        <FreeArrangementFields control={form.control} names={FREE_JUSTIFICATION_NAMES} t={t} idPrefix="create-pod-venue" />
      )}
      <VenueOfferAskFields
        control={form.control}
        offeringsName="venue_offer_offerings"
        noteName="venue_offer_note"
        idPrefix="create-pod"
        labels={{
          offerings: requiredLabel(t('availability.offers.ask.offeringsLabel'), true),
          offeringsHint: t('availability.offers.ask.offeringsHint'),
          note: t('availability.offers.ask.noteLabel'),
          noteHint: t('availability.offers.ask.noteHint', { vars: { max: VENUE_OFFER_ASK_LIMITS.note } }),
        }}
      />
      <VenueQuoteCard
        quote={quote.quote}
        quoteMin={quote.quoteMin}
        message={quote.message}
        loading={quote.loading}
        error={quote.error}
        free={freeVenue}
      />
    </Stack>
  );
}
