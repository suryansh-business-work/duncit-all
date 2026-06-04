import { useState } from 'react';
import { Image, Modal, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { ProfilePost } from '@/hooks/useProfile';

/** A 3-column grid of the user's posts; tapping opens a full-screen viewer. */
export function ProfilePostsGrid({ posts }: { posts: ProfilePost[] }) {
  const { width } = useWindowDimensions();
  const { muted } = useThemeColors();
  const size = (width - 32 - 8) / 3;
  const [active, setActive] = useState<ProfilePost | null>(null);

  return (
    <YStack paddingHorizontal={16} gap={10} paddingBottom={24}>
      <Text fontSize={16} fontWeight="900" color="$color">
        Posts
      </Text>
      {posts.length === 0 ? (
        <Text testID="profile-no-posts" fontSize={13} color="$muted">
          No posts yet.
        </Text>
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

      <Modal
        visible={!!active}
        transparent
        animationType="fade"
        onRequestClose={() => setActive(null)}
      >
        <ModalThemeScope>
          <YStack
            testID="post-viewer"
            flex={1}
            backgroundColor="rgba(0,0,0,0.94)"
            onPress={() => setActive(null)}
          >
            <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
              <XStack justifyContent="flex-end" padding={16}>
                <XStack
                  testID="post-viewer-close"
                  role="button"
                  aria-label="Close"
                  onPress={() => setActive(null)}
                  width={36}
                  height={36}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={18}
                  backgroundColor="rgba(255,255,255,0.16)"
                >
                  <MaterialIcons name="close" size={20} color="#ffffff" />
                </XStack>
              </XStack>
              <YStack flex={1} alignItems="center" justifyContent="center" paddingHorizontal={12}>
                {active?.image_url ? (
                  <Image
                    testID="post-viewer-image"
                    source={{ uri: active.image_url }}
                    style={{ width: '100%', height: '78%', borderRadius: 16 }}
                    resizeMode="contain"
                  />
                ) : null}
              </YStack>
              {active?.caption ? (
                <Text color="#ffffff" fontSize={14} textAlign="center" padding={16}>
                  {active.caption}
                </Text>
              ) : null}
            </SafeAreaView>
          </YStack>
        </ModalThemeScope>
      </Modal>
    </YStack>
  );
}
