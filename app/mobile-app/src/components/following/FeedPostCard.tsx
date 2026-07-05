import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { FeedPost } from '@/hooks/useFollowingFeed';
import { formatDateTime } from '@/utils/date-format';

interface Props {
  post: FeedPost;
  onToggleLike: () => void;
  onOpenComments: () => void;
  onOpenAuthor: () => void;
}

/** One Following-feed card — author header, media, caption and a like/comment
 * action row. Comments open the existing full post viewer. */
export function FeedPostCard({
  post,
  onToggleLike,
  onOpenComments,
  onOpenAuthor,
}: Readonly<Props>) {
  const { primary, muted } = useThemeColors();
  const name = post.author?.first_name || post.author?.full_name || 'Duncit member';
  const avatar = post.author?.profile_photo;

  return (
    <YStack
      testID={`feed-post-${post.id}`}
      borderRadius={18}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      overflow="hidden"
    >
      <XStack
        testID={`feed-author-${post.id}`}
        role="button"
        aria-label={`Open ${name}`}
        onPress={onOpenAuthor}
        alignItems="center"
        gap={10}
        padding={12}
        pressStyle={{ opacity: 0.85 }}
      >
        {avatar ? (
          <AppImage source={{ uri: avatar }} style={{ width: 36, height: 36, borderRadius: 18 }} />
        ) : (
          <YStack
            width={36}
            height={36}
            borderRadius={18}
            backgroundColor="$primary"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={14} fontWeight="900" color="$onPrimary">
              {name.charAt(0).toUpperCase()}
            </Text>
          </YStack>
        )}
        <YStack flex={1} minWidth={0}>
          <Text fontSize={14} fontWeight="900" color="$color" numberOfLines={1}>
            {name}
          </Text>
          <Text fontSize={11} color="$muted">
            {formatDateTime(post.created_at)}
          </Text>
        </YStack>
        {post.kind === 'STORY' ? (
          <XStack
            borderRadius={999}
            paddingHorizontal={9}
            paddingVertical={3}
            backgroundColor="$primary"
          >
            <Text fontSize={10} fontWeight="900" color="$onPrimary">
              STORY
            </Text>
          </XStack>
        ) : null}
      </XStack>

      {post.image_url ? (
        <AppImage
          source={{ uri: post.image_url }}
          style={{ width: '100%', height: 260 }}
          resizeMode="cover"
        />
      ) : null}

      <YStack padding={12} gap={8}>
        {post.caption ? (
          <Text fontSize={13.5} color="$color" numberOfLines={3}>
            {post.caption}
          </Text>
        ) : null}
        <XStack alignItems="center" gap={18}>
          <XStack
            testID={`feed-like-${post.id}`}
            role="button"
            aria-label={post.liked_by_me ? 'Unlike' : 'Like'}
            onPress={onToggleLike}
            alignItems="center"
            gap={5}
            pressStyle={{ opacity: 0.6 }}
          >
            <MaterialIcons
              name={post.liked_by_me ? 'favorite' : 'favorite-border'}
              size={20}
              color={post.liked_by_me ? primary : muted}
            />
            <Text fontSize={13} fontWeight="800" color="$muted">
              {post.likes_count}
            </Text>
          </XStack>
          <XStack
            testID={`feed-comment-${post.id}`}
            role="button"
            aria-label="Comments"
            onPress={onOpenComments}
            alignItems="center"
            gap={5}
            pressStyle={{ opacity: 0.6 }}
          >
            <MaterialIcons name="chat-bubble-outline" size={19} color={muted} />
            <Text fontSize={13} fontWeight="800" color="$muted">
              {post.comments_count}
            </Text>
          </XStack>
        </XStack>
      </YStack>
    </YStack>
  );
}
