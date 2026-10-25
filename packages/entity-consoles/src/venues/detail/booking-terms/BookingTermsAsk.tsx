import { useId } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { offerGuestsText } from '@duncit/utils';
import type { VenueBookingTermsRow } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

/** "8–20 guests", or "20 guests" when the booking has no smaller minimum; '' when the count is unknown. */
export function bookingGuestsLabel(t: Translate, min: number, max: number): string {
  return max > 0 ? offerGuestsText(t, min, max) : '';
}

/** Whose move a pending booking waits on: the host (the venue countered) or the venue. */
export const bookingPendingLabel = (t: Translate, awaiting: string | null): string =>
  awaiting === 'HOST' ? t('admin.venueBookingTerms.awaitingHost') : t('availability.offers.termsPending');

/**
 * The negotiation side of one booking, under its money: how many guests it is
 * for (the venue's minimum up to the pod's spots), which round it is on, when
 * the pending answer is due, what the venue was asked to provide and the note
 * on the terms. A booking made before offers has none of these and shows none.
 */
export default function BookingTermsAsk({ row }: Readonly<{ row: VenueBookingTermsRow }>) {
  const { t } = useTranslation();
  const fmt = useDateFormat({ timeZoneAware: true });
  const listId = useId();
  const facts = [
    bookingGuestsLabel(t, row.min_guests, row.max_guests),
    row.round > 0 ? t('admin.venueBookingTerms.round', { vars: { round: row.round } }) : '',
  ].filter(Boolean);
  // A point said twice reads once.
  const points = [...new Set(row.offerings)];
  const answerBy = row.status === 'PENDING' ? row.expires_at : null;

  return (
    <Stack spacing={0.5} sx={{ mt: 0.5 }} data-testid={`booking-terms-ask-${row.slot_id}`}>
      {facts.length > 0 && <Typography variant="caption">{facts.join(' · ')}</Typography>}
      {answerBy && (
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          {t('availability.offers.answerBy', { vars: { date: fmt.formatDateTime(answerBy) } })}
        </Typography>
      )}
      {points.length > 0 && (
        <Box>
          <Typography id={listId} variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            {t('availability.offers.offeringsLabel')}
          </Typography>
          <Box component="ul" aria-labelledby={listId} sx={{ m: 0, pl: 2.5 }}>
            {points.map((point) => (
              <Typography key={point} component="li" variant="caption" sx={{ display: 'list-item', overflowWrap: 'anywhere' }}>
                {point}
              </Typography>
            ))}
          </Box>
        </Box>
      )}
      {row.note && (
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block' }}>
            {t('admin.venueBookingTerms.note')}
          </Typography>
          <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {row.note}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
