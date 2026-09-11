import { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { PostViewerSheet } from '@/components/profile/post-viewer/PostViewerSheet';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { ProfilePost } from '@/hooks/useProfile';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Header "Add post" pill; shows an uploading state while a post is in flight. */
function AddPostButton({
  uploading,
  onAddPost,
  onPrimary,
}: Readonly<{ uploading?: boolean; onAddPost: () => void; onPrimary: string }>) {
  const { t } = useTranslation();
  return (
    <XStack
      testID="profile-add-post"
      role="button"
      aria-label={t('mweb.profile.addPost')}
      aria-disabled={uploading}
      onPress={uploading ? undefined : onAddPost}
      alignItems="center"
      gap={5}
      height={36}
      paddingHorizontal={14}
      borderRadius={999}
      backgroundColor="$primary"
      opacity={uploading ? 0.6 : 1}
      pressStyle={PRESS_STYLE.solid}
    >
      <MaterialIcons name={uploading ? 'hourglass-top' : 'add'} size={16} color={onPrimary} />
      <Text fontSize={13} fontWeight="600" color={onPrimary}>
        {uploading ? 'Uploading…' : 'Add post'}
      </Text>
    </XStack>
  );
}

/** A 3-column grid of the user's posts; tapping opens a full-screen viewer.
 * An optional add-post action mirrors mWeb's "New post" entry. */
export function ProfilePostsGrid({
  posts,
  meId,
  onAddPost,
  onChanged,
  uploading,
}: Readonly<{
  posts: ProfilePost[];
  meId?: string;
  onAddPost?: () => void;
  onChanged?: () => void;
  uploading?: boolean;
}>) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { muted, accent, onPrimary } = useThemeColors();
  const size = (width - 32 - 8) / 3;
  const [active, setActive] = useState<ProfilePost | null>(null);

  return (
    <YStack paddingHorizontal={16} gap={12} paddingBottom={24}>
      <XStack alignItems="center" justifyContent="space-between">
        <Text accessibilityRole="header" fontSize={17} fontWeight="600" color="$color">
          Posts
        </Text>
        {onAddPost ? (
          <AddPostButton uploading={uploading} onAddPost={onAddPost} onPrimary={onPrimary} />
        ) : null}
      </XStack>
      {posts.length === 0 ? (
        <YStack testID="profile-no-posts" alignItems="center" gap={12} paddingVertical={28}>
          <YStack
            width={64}
            height={64}
            borderRadius={32}
            alignItems="center"
            justifyContent="center"
            backgroundColor="$soft"
          >
            <MaterialIcons name="add-a-photo" size={28} color={accent} />
          </YStack>
          <Text fontSize={14} fontWeight="500" color="$muted">
            No posts yet.
          </Text>
          {onAddPost ? (
            <XStack
              testID="profile-add-post-empty"
              role="button"
              aria-label={t('mweb.profile.addYourFirstPost')}
              aria-disabled={uploading}
              onPress={uploading ? undefined : onAddPost}
              alignItems="center"
              gap={6}
              height={44}
              paddingHorizontal={18}
              borderRadius={999}
              backgroundColor="$primary"
              pressStyle={PRESS_STYLE.solid}
            >
              <MaterialIcons name="add" size={18} color={onPrimary} />
              <Text fontSize={14} fontWeight="600" color="$onPrimary">
                Add your first post
              </Text>
            </XStack>
          ) : null}
        </YStack>
      ) : (
        <XStack flexWrap="wrap" gap={4}>
          {posts.map((post) => (
            <YStack
              key={post.id}
              testID={`post-${post.id}`}
              role="button"
              aria-label={t('mweb.common.openPost')}
              onPress={() => setActive(post)}
              width={size}
              height={size}
              borderRadius={12}
              overflow="hidden"
              backgroundColor="$soft"
              alignItems="center"
              justifyContent="center"
              pressStyle={PRESS_STYLE.control}
            >
              {post.image_url ? (
                <AppImage
                  source={{ uri: post.image_url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <MaterialIcons name="image" size={28} color={muted} />
              )}
            </YStack>
          ))}
        </XStack>
      )}

      {active ? (
        <PostViewerSheet
          postId={active.id}
          meId={meId}
          onClose={() => setActive(null)}
          onDeleted={() => {
            setActive(null);
            onChanged?.();
          }}
        />
      ) : null}
    </YStack>
  );
}
