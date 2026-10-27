import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { VenueChatThreadList } from '@duncit/ui';
import { VENUE_CHAT_THREADS_PAGE } from '@duncit/utils';
import SectionCard from '../SectionCard';
import { ADMIN_VENUE_CHAT_THREADS } from './queries';
import VenueChatReadOnlyThread from './VenueChatReadOnlyThread';

/**
 * Venues → one venue → Chats: the venue's conversations with the hosts of its
 * pods, newest activity first, each opening read-only. Staff never write here.
 */
export default function VenueChatsTab({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const [open, setOpen] = useState<string | null>(null);
  const { data, loading, error, fetchMore } = useQuery(ADMIN_VENUE_CHAT_THREADS, {
    variables: { venue_id: venueId, limit: VENUE_CHAT_THREADS_PAGE, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });
  const page = data?.adminVenueChatThreads;
  const rows = page?.rows ?? [];

  const showMore = () => {
    fetchMore({
      variables: { offset: rows.length },
      updateQuery: (prev, { fetchMoreResult }) => ({
        adminVenueChatThreads: {
          ...fetchMoreResult.adminVenueChatThreads,
          rows: [...prev.adminVenueChatThreads.rows, ...fetchMoreResult.adminVenueChatThreads.rows],
        },
      }),
    }).catch((moreError: unknown) => console.warn('[VenueChatsTab] show more failed', moreError));
  };

  const renderBody = () => {
    const openRow = rows.find((row) => row.pod_id === open);
    if (openRow) {
      return <VenueChatReadOnlyThread podId={openRow.pod_id} title={openRow.pod_title} onBack={() => setOpen(null)} />;
    }
    if (loading && !page) {
      return (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
          <CircularProgress size={24} aria-label={t('shell.a11y.loading')} />
        </Box>
      );
    }
    if (error && !page) return <Alert severity="error">{t('admin.venueDetails.chatsLoadFailed')}</Alert>;
    return (
      <>
        <VenueChatThreadList
          rows={rows}
          onOpen={setOpen}
          formatWhen={formatDateTime}
          labels={{
            empty: t('admin.venueDetails.chatsEmpty'),
            photo: t('admin.venueDetails.chatPhoto'),
            noMessagesYet: t('admin.venueDetails.chatNoMessagesYet'),
            unread: (n) => t('admin.venueDetails.chatUnread', { vars: { n } }),
          }}
        />
        {page && rows.length < page.total && (
          <DuncitButton onClick={showMore} disabled={loading} sx={{ mt: 1.5 }}>
            {t('admin.venueDetails.chatsShowMore')}
          </DuncitButton>
        )}
      </>
    );
  };

  return (
    <SectionCard icon={<ForumOutlinedIcon fontSize="small" />} title={t('admin.venueDetails.chatsTitle')}>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
        {t('admin.venueDetails.chatsSubtitle')}
      </Typography>
      {renderBody()}
    </SectionCard>
  );
}
