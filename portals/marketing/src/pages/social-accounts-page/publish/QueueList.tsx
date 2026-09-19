import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, LinearProgress, Stack } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { SOCIAL_SCHEDULED_POSTS, type SocialQueueView, type SocialScheduledPost } from '../publish.queries';
import ScheduledPostCard from './ScheduledPostCard';

/** A post going out right now is followed until it lands — every few seconds, and only while one is. */
const FOLLOW_MS = 5_000;

const EMPTY: Record<SocialQueueView, string> = {
  QUEUE: 'marketing.social.emptyQueue',
  DRAFTS: 'marketing.social.emptyDrafts',
  SENT: 'marketing.social.emptySent',
};

interface Props {
  view: SocialQueueView;
  onEdit: (post: SocialScheduledPost) => void;
}

/** Buffer's Queue, Drafts and Sent: the posts written here, soonest (or newest) first. */
export default function QueueList({ view, onEdit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error, startPolling, stopPolling } = useQuery<{ socialScheduledPosts: SocialScheduledPost[] }>(
    SOCIAL_SCHEDULED_POSTS,
    { variables: { view }, fetchPolicy: 'cache-and-network' }
  );
  const posts = data?.socialScheduledPosts ?? [];
  const publishing = posts.some((post) => post.status === 'PUBLISHING');

  useEffect(() => {
    if (!publishing) return undefined;
    startPolling(FOLLOW_MS);
    return () => stopPolling();
  }, [publishing, startPolling, stopPolling]);

  if (loading && !data) return <LinearProgress />;
  if (error) return <Alert severity="error">{parseApiError(error)}</Alert>;
  if (posts.length === 0) {
    return (
      <Alert severity="info" variant="outlined">
        {t(EMPTY[view])}
      </Alert>
    );
  }
  return (
    <Stack spacing={1.5} data-testid={`social-queue-${view.toLowerCase()}`}>
      {posts.map((post) => (
        <ScheduledPostCard key={post.id} post={post} onEdit={onEdit} />
      ))}
    </Stack>
  );
}
