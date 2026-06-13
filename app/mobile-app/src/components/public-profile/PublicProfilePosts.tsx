import { useState } from 'react';
import { Image, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { ImageViewerModal } from '@/components/ImageViewerModal';
import type { PublicProfilePost } from '@/hooks/usePublicProfile';

/** Posts grid + active stories on a member's public profile. Shows a lock card
 * for a private account the viewer doesn't follow. */
export function PublicProfilePosts({
  posts,
  stories,
  canView,
}: Readonly<{ posts: PublicProfilePost[]; stories: string[]; canView: boolean }>) {
  const { width } = useWindowDimensions();
  const [postIndex, setPostIndex] = useState<number | null>(null);
  const [storyIndex, setStoryIndex] = useState<number | null>(null);

  if (!canView) {
    return (
      <YStack
        testID="public-profile-private"
        alignItems="center"
        gap={8}
        paddingVertical={32}
        paddingHorizontal={24}
      >
        <MaterialIcons name="lock-outline" size={28} color="#9aa0a6" />
        <Text fontSize={15} fontWeight="900" color="$color">
          This account is private
        </Text>
        <Text fontSize={13} color="$muted" textAlign="center">
          Follow this account to see their posts and status.
        </Text>
      </YStack>
    );
  }

  const cell = Math.floor((Math.min(width, 520) - 32 - 8) / 3);
  const postImages = posts.map((post) => post.image_url);

  return (
    <YStack gap={12}>
      {stories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingHorizontal: 4 }}
        >
          {stories.map((url, index) => (
            <XStack
              key={`${index}-${url}`}
              testID={`public-profile-story-${index}`}
              role="button"
              aria-label={`Open status ${index + 1}`}
              onPress={() => setStoryIndex(index)}
              borderRadius={36}
              borderWidth={3}
              borderColor="$primary"
              padding={2}
            >
              <Image source={{ uri: url }} style={{ width: 60, height: 60, borderRadius: 30 }} />
            </XStack>
          ))}
        </ScrollView>
      ) : null}

      <XStack alignItems="center" justifyContent="center" gap={6} paddingTop={4}>
        <MaterialIcons name="grid-on" size={16} color="#9aa0a6" />
        <Text fontSize={12} fontWeight="800" color="$muted" letterSpacing={1.5}>
          POSTS
        </Text>
      </XStack>

      {posts.length === 0 ? (
        <Text
          testID="public-profile-no-posts"
          fontSize={13}
          color="$muted"
          textAlign="center"
          paddingVertical={20}
        >
          No posts yet.
        </Text>
      ) : (
        <XStack flexWrap="wrap" gap={4} justifyContent="flex-start">
          {posts.map((post, index) => (
            <XStack
              key={post.id}
              testID={`public-profile-post-${index}`}
              role="button"
              aria-label="Open post"
              onPress={() => setPostIndex(index)}
            >
              <Image
                source={{ uri: post.image_url }}
                style={{ width: cell, height: cell, borderRadius: 6 }}
                resizeMode="cover"
              />
            </XStack>
          ))}
        </XStack>
      )}

      <ImageViewerModal images={postImages} index={postIndex} onClose={() => setPostIndex(null)} />
      <ImageViewerModal images={stories} index={storyIndex} onClose={() => setStoryIndex(null)} />
    </YStack>
  );
}
