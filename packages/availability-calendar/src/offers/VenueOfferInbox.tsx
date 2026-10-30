import { useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import OfferRequestCard, { type OfferChatLink } from './OfferRequestCard';
import { VENUE_BOOKING_REQUESTS, type BookingRequestRow } from './queries';

interface Props {
  /** One venue's requests; null for every venue the owner has. */
  venueId: string | null;
  /** Called after any answer, so a page's other lists (history, counts) re-read too. */
  onAnswered?: () => unknown;
  /** Puts a "chat with the host" button on every request; left out (Partners console), none. */
  chat?: OfferChatLink;
}

/**
 * The venue's booking requests — hosts who want to run a pod there, each with
 * the price they offer — answered with Accept, Counter or Reject. One inbox for
 * the Partners console and mWeb; the native app draws the same rows itself.
 */
export default function VenueOfferInbox({ venueId, onAnswered, chat }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<{ venueSlotRequests: BookingRequestRow[] }>(VENUE_BOOKING_REQUESTS, {
    variables: { venue_id: venueId },
    fetchPolicy: 'cache-and-network',
  });
  const requests = data?.venueSlotRequests ?? [];
  const answered = async () => {
    await refetch();
    await onAnswered?.();
  };

  return (
    <Stack spacing={1.5} data-testid="venue-offer-inbox">
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('availability.offers.intro')}
      </Typography>
      {error && <Alert severity="error">{t('availability.offers.loadFailed')}</Alert>}
      {loading && !data && <Skeleton variant="rounded" height={160} aria-label={t('availability.offers.loading')} />}
      {!loading && !error && requests.length === 0 && <Alert severity="info">{t('availability.offers.empty')}</Alert>}
      {requests.map((request) => (
        <OfferRequestCard key={request.slot_id} request={request} onDone={answered} chat={chat} />
      ))}
    </Stack>
  );
}
