import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack } from 'tamagui';

import { FeedList } from '@/components/FeedList';
import { FeedPostCard } from '@/components/following/FeedPostCard';
import { PostViewerSheet } from '@/components/profile/post-viewer/PostViewerSheet';
import { TabScreen } from '@/components/TabScreen';
import { useFollowingFeed, type FeedPost, type FeedSource } from '@/hooks/useFollowingFeed';
import { useMe } from '@/hooks/useMe';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';

const TABS: FeedSource[] = ['PEOPLE', 'CLUBS'];
const TAB_LABELS: Record<FeedSource, string> = { PEOPLE: 'People', CLUBS: 'Clubs' };
const EMPTY_TEXT: Record<FeedSource, string> = {
  PEOPLE: 'No posts yet. Follow people to see their posts and stories here.',
  CLUBS: 'No posts yet. Follow clubs to see their posts and stories here.',
};

/** Following tab — a social FEED of posts + active stories from the people and
 * clubs the user follows (like + comment via the existing post viewer). No pods.
 * mWeb FollowPage parity. */
export function FollowingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: meData } = useMe();
  const meId = meData?.me?.user_id;
  const [tab, setTab] = useState<FeedSource>('PEOPLE');
  const people = useFollowingFeed('PEOPLE');
  const clubs = useFollowingFeed('CLUBS');
  const feed = tab === 'PEOPLE' ? people : clubs;
  const [viewerPostId, setViewerPostId] = useState<string | null>(null);

  const openAuthor = (post: FeedPost) => {
    if (post.club_id) {
      navigation.navigate('ClubDetails', { clubId: post.club_id, title: 'Club' });
    } else {
      navigation.navigate('PublicProfile', { userId: post.author_id });
    }
  };

  return (
    <TabScreen testID="following-screen">
      <XStack gap={8} paddingHorizontal={16} paddingVertical={8}>
        {TABS.map((value) => {
          const selected = tab === value;
          return (
            <XStack
              key={value}
              testID={`following-tab-${value.toLowerCase()}`}
              role="button"
              aria-pressed={selected}
              onPress={() => setTab(value)}
              flex={1}
              height={36}
              alignItems="center"
              justifyContent="center"
              borderRadius={12}
              backgroundColor={selected ? '$primary' : '$surface'}
              borderWidth={1}
              borderColor={selected ? '$primary' : '$borderColor'}
              pressStyle={{ opacity: 0.85 }}
            >
              <Text fontSize={13} fontWeight="900" color={selected ? '$onPrimary' : '$color'}>
                {TAB_LABELS[value]}
              </Text>
            </XStack>
          );
        })}
      </XStack>

      <FeedList
        testID="following-feed"
        isLoading={feed.isLoading}
        isEmpty={feed.posts.length === 0}
        emptyText={EMPTY_TEXT[tab]}
        onRefresh={() => fireAndForget(feed.refetch())}
        data={feed.posts}
        keyExtractor={(post) => post.id}
        renderItem={(post) => (
          <FeedPostCard
            post={post}
            onToggleLike={() => fireAndForget(feed.toggleLike(post))}
            onOpenComments={() => setViewerPostId(post.id)}
            onOpenAuthor={() => openAuthor(post)}
          />
        )}
      />

      {viewerPostId ? (
        <PostViewerSheet
          postId={viewerPostId}
          meId={meId}
          onClose={() => setViewerPostId(null)}
          onDeleted={() => {
            setViewerPostId(null);
            fireAndForget(feed.refetch());
          }}
        />
      ) : null}
    </TabScreen>
  );
}
