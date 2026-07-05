import { useMemo, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import PostDialog from './profile-page/post-dialog/PostDialog';
import FollowFeedList from './follow-page/FollowFeedList';
import { FEED_CLUBS, FOLLOW_ME } from './follow-page/queries';
import type { FeedClub, FollowingFeedSource } from './follow-page/queries';

const EMPTY_TEXT: Record<FollowingFeedSource, string> = {
  CLUBS: 'Follow clubs to see their posts here',
  PEOPLE: 'Follow people to see their posts here',
};

interface FeedClubsData {
  superCategories: { id: string; slug: string }[];
  clubs: FeedClub[];
}

export default function FollowPage({ superCategorySlug }: Readonly<{ superCategorySlug?: string }>) {
  const apollo = useApolloClient();
  const [tab, setTab] = useState<FollowingFeedSource>('CLUBS');
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const meQuery = useQuery(FOLLOW_ME, { fetchPolicy: 'cache-and-network' });
  const clubsQuery = useQuery<FeedClubsData>(FEED_CLUBS, {
    skip: tab !== 'CLUBS',
    fetchPolicy: 'cache-and-network',
  });

  const clubsById = useMemo(
    () => new Map((clubsQuery.data?.clubs ?? []).map((club) => [club.id, club])),
    [clubsQuery.data]
  );
  const superCategoryId = superCategorySlug
    ? (clubsQuery.data?.superCategories?.find((category) => category.slug === superCategorySlug)
        ?.id ?? null)
    : null;

  const closePost = () => setOpenPostId(null);
  const onPostDeleted = () => {
    setOpenPostId(null);
    apollo.refetchQueries({ include: ['FollowingFeed'] }).catch(() => {
      /* best-effort feed refresh */
    });
  };

  return (
    <Stack
      spacing={2}
      sx={{
        mx: { xs: -1.25, sm: -2 },
        px: { xs: 1.25, sm: 2 },
        py: 1.5,
        minHeight: '100%',
      }}
    >
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1 }}>
          Following
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4, fontWeight: 700 }}>
          Latest posts and stories from your clubs and people
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        variant="fullWidth"
        sx={{ minHeight: 40, '& .MuiTab-root': { fontWeight: 900, minHeight: 40 } }}
      >
        <Tab value="CLUBS" label="Clubs" />
        <Tab value="PEOPLE" label="People" />
      </Tabs>

      <FollowFeedList
        source={tab}
        emptyText={EMPTY_TEXT[tab]}
        clubsById={tab === 'CLUBS' ? clubsById : undefined}
        superCategoryId={tab === 'CLUBS' ? superCategoryId : null}
        onOpenComments={setOpenPostId}
      />

      <PostDialog
        postId={openPostId}
        meId={meQuery.data?.me?.user_id ?? ''}
        onClose={closePost}
        onDeleted={onPostDeleted}
      />
    </Stack>
  );
}
