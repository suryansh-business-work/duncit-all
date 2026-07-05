import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Skeleton, Stack, Typography } from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { TOGGLE_LIKE } from '../profile-page/queries';
import FeedPostCard from './FeedPostCard';
import { FOLLOWING_FEED } from './queries';
import type { FeedClub, FeedPost, FollowingFeedSource } from './queries';

interface FollowFeedListProps {
  source: FollowingFeedSource;
  emptyText: string;
  /** CLUBS tab only: resolves post.club_id → club for the card header. */
  clubsById?: ReadonlyMap<string, FeedClub>;
  /** CLUBS tab only: header super-category filter (null = show all). */
  superCategoryId?: string | null;
  onOpenComments: (postId: string) => void;
}

export default function FollowFeedList({
  source,
  emptyText,
  clubsById,
  superCategoryId,
  onOpenComments,
}: Readonly<FollowFeedListProps>) {
  const { data, loading, error } = useQuery<{ followingFeed: FeedPost[] }>(FOLLOWING_FEED, {
    variables: { source, limit: 60 },
    fetchPolicy: 'cache-and-network',
  });
  const [toggleLike] = useMutation(TOGGLE_LIKE);

  const posts = useMemo(() => {
    const items = data?.followingFeed ?? [];
    if (!superCategoryId) return items;
    return items.filter(
      (post) => post.club_id && clubsById?.get(post.club_id)?.super_category_id === superCategoryId
    );
  }, [data, superCategoryId, clubsById]);

  const onToggleLike = (post: FeedPost) => {
    toggleLike({
      variables: { id: post.id },
      optimisticResponse: {
        togglePostLike: {
          __typename: 'Post',
          id: post.id,
          liked_by_me: !post.liked_by_me,
          likes_count: post.likes_count + (post.liked_by_me ? -1 : 1),
        },
      },
    }).catch(() => {
      /* Apollo rolls the optimistic update back on failure. */
    });
  };

  if (loading && !data) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: 4 }} />
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: 4 }} />
      </Stack>
    );
  }

  if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  if (posts.length === 0) {
    return (
      <Box sx={{ p: 4, borderRadius: 4, bgcolor: 'action.hover', textAlign: 'center' }}>
        <FavoriteBorderIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontWeight: 700 }}>
          {emptyText}
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {posts.map((post) => {
        const club = post.club_id ? (clubsById?.get(post.club_id) ?? null) : null;
        return (
          <FeedPostCard
            key={post.id}
            post={post}
            club={club}
            onToggleLike={onToggleLike}
            onOpenComments={onOpenComments}
          />
        );
      })}
    </Stack>
  );
}
