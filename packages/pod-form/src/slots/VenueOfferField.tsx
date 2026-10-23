import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { SlotCalendar } from '@duncit/slots/mui';
import {
  bookingCalendarRange,
  offerCalendarPicks,
  type BookingTile,
  type OfferCalendar,
} from '@duncit/utils';

import { usePodFormData } from '../context';
import { useTranslation } from '../i18n/useTranslation';
import { VENUE_OFFER_CALENDAR } from './offerQueries';

export interface VenueOfferFieldProps {
  venueId: string;
  /** The window picked so far (the pod's start and end). */
  start: Date | null;
  end: Date | null;
  /** A start is always picked with its first end (a start is only offered with room for one). */
  onWindow: (start: string, end: string) => void;
}

/**
 * Pick the window to offer the venue — a start the venue is open and free for
 * (days it is shut, or times already booked, cannot be picked), then an end up
 * to closing. The window becomes the pod's date and time; the venue answers the
 * offer once the pod is sent. mWeb / native twin: VenueOfferPicker.
 */
export default function VenueOfferField({ venueId, start, end, onWindow }: Readonly<VenueOfferFieldProps>) {
  const { t } = useTranslation();
  const { dateFormatter, slotLabels } = usePodFormData();
  const { timeZone } = dateFormatter;
  const range = useMemo(() => bookingCalendarRange(dateFormatter.dayKey(dateFormatter.clock.nowMs())), [dateFormatter]);
  const { data, loading, error } = useQuery<{ venueOfferCalendar: OfferCalendar }>(VENUE_OFFER_CALENDAR, {
    variables: { venue_id: venueId, ...range, space_label: '' },
    skip: !venueId,
    fetchPolicy: 'cache-and-network',
  });
  const picks = useMemo(
    () => offerCalendarPicks(data?.venueOfferCalendar, timeZone, dateFormatter.clock.nowMs()),
    [data, timeZone, dateFormatter]
  );
  const startIso = start ? start.toISOString() : null;
  const endIso = end ? end.toISOString() : '';
  const ends = picks.endsFor(startIso);

  if (!venueId) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {slotLabels.pickVenueFirst}
      </Typography>
    );
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;

  const pick = (tile: BookingTile) => onWindow(tile.start_at, picks.endsFor(tile.start_at)[0]);

  return (
    <Stack spacing={2} data-testid="pod-form-venue-offer">
      <SlotCalendar
        slots={picks.tiles.map((tile) => ({ ...tile, caption: '' }))}
        loading={loading && !data}
        selectedSlotId={startIso ?? ''}
        onPick={(tile) => {
          const picked = picks.tiles.find((item) => item.id === tile.id);
          if (picked) pick(picked);
        }}
        fmt={dateFormatter}
        labels={{ ...slotLabels, availableSlots: t('podForm.offer.start') }}
        showPrice={false}
        required
      />
      {startIso && (
        <TextField
          select
          fullWidth
          label={t('podForm.offer.end')}
          value={ends.includes(endIso) ? endIso : ''}
          onChange={(event) => onWindow(startIso, event.target.value)}
          error={ends.length === 0}
          helperText={ends.length ? t('podForm.offer.endHint') : t('podForm.offer.noEnd')}
        >
          {ends.map((option) => (
            <MenuItem key={option} value={option}>
              {dateFormatter.formatTime(option)}
            </MenuItem>
          ))}
        </TextField>
      )}
    </Stack>
  );
}
