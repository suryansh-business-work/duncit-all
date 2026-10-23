import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert, Box, Card, Stack } from '@mui/material';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import { DuncitButton } from '@duncit/buttons';
import { Loader, VenueChatThreadList } from '@duncit/ui';
import { VENUE_CHAT_THREADS_PAGE, venueChatPath } from '@duncit/utils';
import { useSelectedVenue } from '../../hooks/useSelectedVenue';
import { useTranslation } from '../../i18n/useTranslation';
import { useDateFormat } from '../../utils/dateFormat';
import VenuePageFrame from '../venue-manage-page/VenuePageFrame';
import { MY_VENUES_SWITCHER } from '../venue-manage-page/queries';
import { MY_VENUE_CHAT_THREADS } from './queries';

/** One venue's conversations with its pods' hosts, newest activity first. */
function VenueChatInbox({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const navigate = useNavigate();
  const { data, loading, error, fetchMore } = useQuery(MY_VENUE_CHAT_THREADS, {
    variables: { venue_id: venueId, limit: VENUE_CHAT_THREADS_PAGE, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });
  const page = data?.myVenueChatThreads;
  const rows = page?.rows ?? [];

  if (loading && !page) return <Box sx={{ py: 4 }}><Loader size={24} /></Box>;
  if (error && !page) return <Alert severity="error">{t('mweb.venueChat.inboxLoadFailed')}</Alert>;

  const showMore = () => {
    fetchMore({
      variables: { offset: rows.length },
      updateQuery: (prev, { fetchMoreResult }) => ({
        myVenueChatThreads: {
          ...fetchMoreResult.myVenueChatThreads,
          rows: [...prev.myVenueChatThreads.rows, ...fetchMoreResult.myVenueChatThreads.rows],
        },
      }),
    }).catch((moreError: unknown) => console.warn('[VenueChatsPage] show more failed', moreError));
  };

  return (
    <Stack spacing={1.5}>
      <Card data-testid="venue-chats">
        <VenueChatThreadList
          rows={rows}
          onOpen={(podId) => navigate(venueChatPath(podId))}
          formatWhen={formatDateTime}
          labels={{
            empty: t('mweb.venueChat.inboxEmpty'),
            photo: t('mweb.venueChat.photo'),
            noMessagesYet: t('mweb.venueChat.noMessagesYet'),
            unread: (n) => t('mweb.venueChat.unread', { vars: { n } }),
          }}
        />
      </Card>
      {page && rows.length < page.total && (
        <DuncitButton onClick={showMore} disabled={loading} sx={{ alignSelf: 'center' }}>
          {t('mweb.venueChat.showMore')}
        </DuncitButton>
      )}
    </Stack>
  );
}

/**
 * Venue Options → Venue Chat: every conversation the owner has with the hosts
 * of pods at the selected venue. A row opens the pod's thread (/venue-chat/:podId).
 */
export default function VenueChatsPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(MY_VENUES_SWITCHER, { fetchPolicy: 'cache-and-network' });
  const venues = data?.myVenues ?? [];
  const { venue, selectVenue } = useSelectedVenue(venues);

  return (
    <VenuePageFrame
      icon={<ForumRoundedIcon fontSize="small" />}
      title={t('mweb.venueChat.inboxTitle')}
      venues={venues}
      venue={venue}
      onSelect={selectVenue}
      loading={loading && !data}
      error={error}
      noVenuesMessage={t('mweb.studioOptions.noVenuesYet')}
    >
      {venue && <VenueChatInbox venueId={venue.id} />}
    </VenuePageFrame>
  );
}
