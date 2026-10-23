import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert, Box, Card, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { VenueChatThreadList } from '@duncit/ui';
import { VENUE_CHAT_THREADS_PAGE } from '@duncit/utils';
import { ALL_VENUES, useVenueFilter } from '../../components/venue/useSelectedVenue';
import { MY_VENUES } from '../register-venue-page/queries';
import { venueChatRoute } from '../venue-chat-page/queries';
import { MY_VENUE_CHAT_THREADS } from './queries';

/**
 * `/venues/chats` — every conversation the venue owner has with the hosts of
 * pods at their venues, newest activity first. A row opens the pod's thread.
 * Opens on the venue picked last; "All my venues" lists every one together.
 */
export default function VenueChatsPage() {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const navigate = useNavigate();
  const venuesQuery = useQuery<{ myVenues: { id: string; venue_name: string }[] }>(MY_VENUES, { fetchPolicy: 'cache-first' });
  const venues = venuesQuery.data?.myVenues ?? [];
  const filter = useVenueFilter(venues);
  const threads = useQuery(MY_VENUE_CHAT_THREADS, {
    variables: { venue_id: filter.venueIdOrNull, limit: VENUE_CHAT_THREADS_PAGE, offset: 0 },
    skip: venuesQuery.loading && !venuesQuery.data,
    fetchPolicy: 'cache-and-network',
  });
  const page = threads.data?.myVenueChatThreads;
  const rows = page?.rows ?? [];

  const showMore = () =>
    fireAndForget(
      threads.fetchMore({
        variables: { offset: rows.length },
        updateQuery: (prev, { fetchMoreResult }) => ({
          myVenueChatThreads: {
            ...fetchMoreResult.myVenueChatThreads,
            rows: [...prev.myVenueChatThreads.rows, ...fetchMoreResult.myVenueChatThreads.rows],
          },
        }),
      }),
      logs.portal['partners-app'],
      'VenueChatsPage',
      'VenueChatsPage.showMore'
    );

  const renderList = () => {
    if (threads.loading && !page) {
      return (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
          <CircularProgress aria-label={t('shell.a11y.loading')} />
        </Box>
      );
    }
    if (threads.error) return <Alert severity="error">{t('mweb.venueChat.inboxLoadFailed')}</Alert>;
    return (
      <Card variant="outlined">
        <VenueChatThreadList
          rows={rows}
          onOpen={(podId) => navigate(venueChatRoute(podId))}
          formatWhen={fmt.formatDateTime}
          showVenue={filter.venueIdOrNull === null}
          labels={{
            empty: t('mweb.venueChat.inboxEmpty'),
            photo: t('mweb.venueChat.photo'),
            noMessagesYet: t('mweb.venueChat.noMessagesYet'),
            unread: (n) => t('mweb.venueChat.unread', { vars: { n } }),
          }}
        />
      </Card>
    );
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
        <Stack spacing={0.25}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 950 }}>
            {t('mweb.venueChat.inboxTitle')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('mweb.venueChat.inboxSubtitle')}
          </Typography>
        </Stack>
        <TextField
          select
          size="small"
          label={t('partners.common.venue')}
          value={filter.value}
          onChange={(event) => filter.change(event.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value={ALL_VENUES}>{t('partners.venuePodsPage.allMyVenues')}</MenuItem>
          {venues.map((venue) => (
            <MenuItem key={venue.id} value={venue.id}>
              {venue.venue_name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {renderList()}
      {page && rows.length < page.total && (
        <DuncitButton onClick={showMore} disabled={threads.loading} sx={{ alignSelf: 'center' }}>
          {t('mweb.venueChat.showMore')}
        </DuncitButton>
      )}
    </Stack>
  );
}
