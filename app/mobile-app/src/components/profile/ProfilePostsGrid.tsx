import { useState } from 'react';
import { Image, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { PostViewerSheet } from '@/components/profile/post-viewer/PostViewerSheet';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { ProfilePost } from '@/hooks/useProfile';

/** Header "Add post" pill; shows an uploading state while a post is in flight. */
function AddPostButton({
  uploading,
  onAddPost,
}: Readonly<{ uploading?: boolean; onAddPost: () => void }>) {
  return (
    <XStack
      testID="profile-add-post"
      role="button"
      aria-label="Add post"
      aria-disabled={uploading}
      onPress={uploading ? undefined : onAddPost}
      alignItems="center"
      gap={5}
      paddingHorizontal={12}
      paddingVertical={7}
      borderRadius={999}
      backgroundColor="$primary"
      opacity={uploading ? 0.6 : 1}
      pressStyle={{ opacity: 0.85 }}
    >
      <MaterialIcons name={uploading ? 'hourglass-top' : 'add'} size={16} color="#ffffff" />
      <Text fontSize={13} fontWeight="900" color="#ffffff">
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
  const { width } = useWindowDimensions();
  const { muted, primary } = useThemeColors();
  const size = (width - 32 - 8) / 3;
  const [active, setActive] = useState<ProfilePost | null>(null);

  return (
    <YStack paddingHorizontal={16} gap={10} paddingBottom={24}>
      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize={16} fontWeight="900" color="$color">
          Posts
        </Text>
        {onAddPost ? <AddPostButton uploading={uploading} onAddPost={onAddPost} /> : null}
      </XStack>
      {posts.length === 0 ? (
        <YStack testID="profile-no-posts" alignItems="center" gap={8} paddingVertical={20}>
          <Text fontSize={13} color="$muted">
            No posts yet.
          </Text>
          {onAddPost ? (
            <XStack
              testID="profile-add-post-empty"
              role="button"
              aria-label="Add your first post"
              aria-disabled={uploading}
              onPress={uploading ? undefined : onAddPost}
              alignItems="center"
              gap={6}
              paddingHorizontal={14}
              paddingVertical={9}
              borderRadius={999}
              borderWidth={1}
              borderColor="$primary"
              pressStyle={{ opacity: 0.85 }}
            >
              <MaterialIcons name="add-a-photo" size={16} color={primary} />
              <Text fontSize={13} fontWeight="900" color="$primary">
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
              aria-label="Open post"
              onPress={() => setActive(post)}
              width={size}
              height={size}
              borderRadius={10}
              overflow="hidden"
              backgroundColor="$muted"
              alignItems="center"
              justifyContent="center"
              pressStyle={{ opacity: 0.85 }}
            >
              {post.image_url ? (
                <Image
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
