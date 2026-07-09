import { useEffect, useState } from 'react';
import { FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { StoryViewersDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Viewer {
  user_id: string;
  viewed_at: string;
  user?: {
    user_id?: string | null;
    full_name?: string | null;
    profile_photo?: string | null;
  } | null;
}

/** Owner-only bottom sheet listing who has viewed a story, newest first (Bug 4).
 * Opens whenever `storyId` is set; the sheet itself stays mounted so a late
 * response never lands on an unmounted component. */
export function StoryViewersSheet({
  storyId,
  onClose,
}: Readonly<{ storyId: string | null; onClose: () => void }>) {
  const { color, muted } = useThemeColors();
  const [viewers, setViewers] = useState<Viewer[] | null>(null);

  useEffect(() => {
    if (!storyId) return;
    setViewers(null);
    graphqlRequest(StoryViewersDocument, { id: storyId }, { auth: true })
      .then((res) => setViewers(res.storyViewers))
      .catch(() => setViewers([]));
  }, [storyId]);

  const count = viewers?.length ?? 0;

  return (
    <Modal visible={!!storyId} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} justifyContent="flex-end" backgroundColor="rgba(0,0,0,0.5)">
          <YStack
            testID="story-viewers-sheet"
            backgroundColor="$background"
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
            maxHeight="70%"
          >
            <SafeAreaView edges={['bottom']}>
              <XStack alignItems="center" justifyContent="space-between" padding={16}>
                <XStack alignItems="center" gap={8}>
                  <MaterialIcons name="visibility" size={20} color={color} />
                  <Text fontSize={16} fontWeight="900" color="$color">
                    {count === 0 ? 'No views yet' : `Seen by ${count}`}
                  </Text>
                </XStack>
                <XStack
                  testID="story-viewers-close"
                  role="button"
                  aria-label="Close viewers"
                  onPress={onClose}
                  width={34}
                  height={34}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={17}
                  backgroundColor="$surface"
                >
                  <MaterialIcons name="close" size={18} color={color} />
                </XStack>
              </XStack>
              {viewers === null ? (
                <YStack padding={24} alignItems="center">
                  <Text color="$muted">Loading…</Text>
                </YStack>
              ) : (
                <FlatList
                  data={viewers}
                  keyExtractor={(v) => v.user_id}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}
                  ListEmptyComponent={
                    <YStack padding={16} alignItems="center">
                      <Text color="$muted">No one has viewed this story yet.</Text>
                    </YStack>
                  }
                  renderItem={({ item }) => (
                    <XStack testID={`story-viewer-${item.user_id}`} alignItems="center" gap={12}>
                      <YStack
                        width={40}
                        height={40}
                        borderRadius={20}
                        overflow="hidden"
                        backgroundColor="$muted"
                        alignItems="center"
                        justifyContent="center"
                      >
                        {item.user?.profile_photo ? (
                          <AppImage
                            source={{ uri: item.user.profile_photo }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        ) : (
                          <MaterialIcons name="person" size={20} color={muted} />
                        )}
                      </YStack>
                      <Text
                        flex={1}
                        fontSize={14}
                        fontWeight="700"
                        color="$color"
                        numberOfLines={1}
                      >
                        {item.user?.full_name ?? 'Someone'}
                      </Text>
                    </XStack>
                  )}
                />
              )}
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
