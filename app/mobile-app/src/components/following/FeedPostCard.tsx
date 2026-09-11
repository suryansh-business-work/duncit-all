import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { FeedPost } from '@/hooks/useFollowingFeed';
import { formatDateTime } from '@/utils/date-format';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

const AVATAR_STYLE = { width: 40, height: 40, borderRadius: 20 };
const MEDIA_STYLE = { width: '100%', height: 260 } as const;

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
  const { t } = useTranslation();
  const { accent, muted } = useThemeColors();
  const name = post.author?.first_name || post.author?.full_name || 'Duncit member';
  const avatar = post.author?.profile_photo;

  return (
    <SurfaceCard testID={`feed-post-${post.id}`} padding={0} overflow="hidden">
      <XStack
        testID={`feed-author-${post.id}`}
        role="button"
        aria-label={`Open ${name}`}
        onPress={onOpenAuthor}
        alignItems="center"
        gap={10}
        padding={12}
        pressStyle={PRESS_STYLE.row}
      >
        {avatar ? (
          <AppImage source={{ uri: avatar }} style={AVATAR_STYLE} />
        ) : (
          <YStack
            width={40}
            height={40}
            borderRadius={20}
            backgroundColor="$primary"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={15} fontWeight="600" color="$onPrimary">
              {name.charAt(0).toUpperCase()}
            </Text>
          </YStack>
        )}
        <YStack flex={1} minWidth={0}>
          <Text fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
            {name}
          </Text>
          <Text fontSize={12} fontWeight="500" color="$muted">
            {formatDateTime(post.created_at)}
          </Text>
        </YStack>
      </XStack>

      {post.image_url ? (
        <YStack marginHorizontal={12} borderRadius={18} overflow="hidden" backgroundColor="$soft">
          <AppImage source={{ uri: post.image_url }} style={MEDIA_STYLE} resizeMode="cover" />
        </YStack>
      ) : null}

      <YStack padding={12} paddingHorizontal={16} gap={8}>
        {post.caption ? (
          <Text fontSize={14} color="$color" numberOfLines={3}>
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
            pressStyle={PRESS_STYLE.inline}
          >
            <MaterialIcons
              name={post.liked_by_me ? 'favorite' : 'favorite-border'}
              size={20}
              color={post.liked_by_me ? accent : muted}
            />
            <Text fontSize={13} fontWeight="600" color="$muted">
              {post.likes_count}
            </Text>
          </XStack>
          <XStack
            testID={`feed-comment-${post.id}`}
            role="button"
            aria-label={t('mweb.common.comments')}
            onPress={onOpenComments}
            alignItems="center"
            gap={5}
            pressStyle={PRESS_STYLE.inline}
          >
            <MaterialIcons name="chat-bubble-outline" size={19} color={muted} />
            <Text fontSize={13} fontWeight="600" color="$muted">
              {post.comments_count}
            </Text>
          </XStack>
        </XStack>
      </YStack>
    </SurfaceCard>
  );
}
