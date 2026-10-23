import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { SlotCalendar } from '@duncit/slots/mui';
import { bookingCalendarRange, offerCalendarPicks, type OfferCalendar } from '@duncit/utils';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import { RESUBMIT_OFFER_CALENDAR } from '../queries';
import type { ResubmitVenueOption } from '../types';

interface VenueFieldProps {
  venues: ResubmitVenueOption[];
  value: string;
  error?: string;
  onChange: (venueId: string) => void;
}

/** Approved-venue picker for the resubmission — any partner venue can be offered the pod. */
export function VenueField({ venues, value, error, onChange }: Readonly<VenueFieldProps>) {
  const { labels } = useHostPodActionsConfig();
  return (
    <TextField
      select
      label={labels.venue}
      required
      fullWidth
      data-testid="pod-resubmit-venue-field"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={!!error}
      helperText={error ?? labels.venueHint}
    >
      {venues.map((venue) => (
        <MenuItem key={venue.id} value={venue.id} data-testid={`resubmit-venue-${venue.id}`}>
          {venue.venue_name}
          {venue.city ? ` · ${venue.city}` : ''}
        </MenuItem>
      ))}
    </TextField>
  );
}

interface OfferWindowFieldProps {
  venueId: string;
  /** The window picked so far (ISO), '' while none is. */
  start: string;
  end: string;
  error?: string;
  /** A start is always picked with its first end (a start is only offered with room for one). */
  onWindow: (start: string, end: string) => void;
}

/**
 * The window to offer the new venue — a start it is open and free for (days it
 * is shut, or times already booked, cannot be picked), then an end up to
 * closing — on the same calendar the create-pod flow, the app and the portals
 * use, so resubmitting feels like creating.
 */
export function OfferWindowField({ venueId, start, end, error, onWindow }: Readonly<OfferWindowFieldProps>) {
  const fmt = useDateFormat();
  const { labels, slotLabels } = useHostPodActionsConfig();
  const range = useMemo(() => bookingCalendarRange(fmt.dayKey(fmt.clock.nowMs())), [fmt]);
  const { data, loading } = useQuery<{ venueOfferCalendar: OfferCalendar }>(RESUBMIT_OFFER_CALENDAR, {
    variables: { venue_id: venueId, ...range, space_label: '' },
    skip: !venueId,
    fetchPolicy: 'cache-and-network',
  });
  const picks = useMemo(
    () => offerCalendarPicks(data?.venueOfferCalendar, fmt.timeZone, fmt.clock.nowMs()),
    [data, fmt]
  );

  if (!venueId) {
    return (
      <Typography variant="body2" data-testid="pod-resubmit-slot-pick-venue-first" sx={{ color: 'text.secondary' }}>
        {slotLabels.pickVenueFirst}
      </Typography>
    );
  }

  const ends = picks.endsFor(start || null);
  return (
    <Stack spacing={2}>
      <SlotCalendar
        slots={picks.tiles}
        loading={loading && !data}
        error={error}
        selectedSlotId={start}
        onPick={(tile) => onWindow(tile.start_at, picks.endsFor(tile.start_at)[0])}
        fmt={fmt}
        labels={slotLabels}
        showPrice={false}
        required
      />
      {start && (
        <TextField
          select
          fullWidth
          label={labels.offerEnd}
          data-testid="pod-resubmit-offer-end"
          value={ends.includes(end) ? end : ''}
          onChange={(e) => onWindow(start, e.target.value)}
          error={ends.length === 0}
          helperText={ends.length ? labels.offerEndHint : labels.offerNoEnd}
        >
          {ends.map((option) => (
            <MenuItem key={option} value={option}>
              {fmt.formatTime(option)}
            </MenuItem>
          ))}
        </TextField>
      )}
    </Stack>
  );
}
