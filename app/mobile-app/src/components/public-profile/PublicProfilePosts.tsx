import { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ImageViewerModal } from '@/components/ImageViewerModal';
import { PublicProfileStories } from '@/components/public-profile/PublicProfileStories';
import { ProfilePodsPanel } from '@/components/profile/ProfilePodsPanel';
import { ProfileTabs, type ProfileTab } from '@/components/profile/ProfileTabs';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { PublicProfilePost, PublicProfileStory } from '@/hooks/usePublicProfile';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Posts grid + active stories on a member's public profile. Shows a lock card
 * for a private account the viewer doesn't follow. */
export function PublicProfilePosts({
  posts,
  stories,
  canView,
  authorId,
  authorName,
  authorPhoto,
  isHost,
  isOwner,
}: Readonly<{
  posts: PublicProfilePost[];
  stories: PublicProfileStory[];
  canView: boolean;
  /** Author of the stories — names the story viewer's header. */
  authorId: string;
  authorName: string;
  authorPhoto?: string | null;
  /** Whether the profile holds the HOST role — the third tab exists only then. */
  isHost: boolean;
  isOwner: boolean;
}>) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { muted } = useThemeColors();
  const [postIndex, setPostIndex] = useState<number | null>(null);
  const [tab, setTab] = useState<ProfileTab>('posts');

  if (!canView) {
    return (
      <YStack
        testID="public-profile-private"
        alignItems="center"
        gap={8}
        paddingVertical={32}
        paddingHorizontal={24}
      >
        <MaterialIcons name="lock-outline" size={28} color={muted} />
        <Text fontSize={15} fontWeight="700" color="$color">
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
      <PublicProfileStories
        authorId={authorId}
        name={authorName}
        photo={authorPhoto}
        stories={stories}
      />

      <ProfileTabs value={tab} onChange={setTab} isHost={isHost} isOwner={isOwner} />

      {tab === 'joined' ? <ProfilePodsPanel userId={authorId} kind="joined" /> : null}
      {tab === 'hosted' && isHost ? <ProfilePodsPanel userId={authorId} kind="hosted" /> : null}
      {tab === 'posts' &&
        (posts.length === 0 ? (
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
                pressStyle={PRESS_STYLE.surface}
                key={post.id}
                testID={`public-profile-post-${index}`}
                role="button"
                aria-label={t('mweb.common.openPost')}
                onPress={() => setPostIndex(index)}
              >
                <AppImage
                  source={{ uri: post.image_url }}
                  style={{ width: cell, height: cell, borderRadius: 6 }}
                  resizeMode="cover"
                />
              </XStack>
            ))}
          </XStack>
        ))}

      <ImageViewerModal images={postImages} index={postIndex} onClose={() => setPostIndex(null)} />
    </YStack>
  );
}
