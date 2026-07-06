import { useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { CreatePodClub } from './create-pod.types';

interface Props {
  club: CreatePodClub | null;
}

/** Selected-club preview — photo + name with a "View club details" dialog
 * showing the club's gallery and description. Mirrors mWeb's ClubPreview. */
export function ClubPreview({ club }: Readonly<Props>) {
  const { color: ink, onPrimary } = useThemeColors();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  if (!club) return null;
  const images = (club.club_feature_images_and_videos ?? []).filter(
    (item) => (item.type ?? 'IMAGE') === 'IMAGE',
  );
  const cover = images[0]?.url;

  return (
    <XStack
      testID="club-preview"
      alignItems="center"
      gap={12}
      padding={12}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      {cover ? (
        <AppImage source={{ uri: cover }} style={{ width: 56, height: 56, borderRadius: 12 }} />
      ) : (
        <YStack
          width={56}
          height={56}
          alignItems="center"
          justifyContent="center"
          borderRadius={12}
          backgroundColor="$primary"
        >
          <MaterialIcons name="groups" size={26} color={onPrimary} />
        </YStack>
      )}
      <YStack flex={1} gap={2}>
        <Text fontSize={14.5} fontWeight="900" color="$color" numberOfLines={1}>
          {club.club_name}
        </Text>
        <XStack alignItems="center" gap={4}>
          <MaterialIcons name="storefront" size={13} color={ink} />
          <Text testID="club-preview-venue-count" fontSize={12} fontWeight="700" color="$muted">
            {club.matched_venues_count ?? 0}{' '}
            {(club.matched_venues_count ?? 0) === 1 ? 'venue' : 'venues'}
          </Text>
        </XStack>
        <Text
          testID="club-preview-details"
          role="button"
          aria-label="View club details"
          onPress={() => setOpen(true)}
          fontSize={12.5}
          fontWeight="900"
          color="$primary"
        >
          View club details
        </Text>
      </YStack>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <ModalThemeScope>
          <YStack flex={1} alignItems="center" justifyContent="center" testID="club-preview-dialog">
            <YStack
              role="button"
              aria-label="Close"
              onPress={close}
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              backgroundColor="rgba(0,0,0,0.5)"
            />
            <YStack
              width="90%"
              maxWidth={440}
              maxHeight="80%"
              backgroundColor="$background"
              borderRadius={20}
              padding={16}
            >
              <SafeAreaView edges={[]}>
                <XStack alignItems="center" justifyContent="space-between" paddingBottom={8}>
                  <Text fontSize={16} fontWeight="900" color="$color" numberOfLines={1} flex={1}>
                    {club.club_name}
                  </Text>
                  <XStack
                    testID="club-preview-close"
                    role="button"
                    aria-label="Close club details"
                    onPress={close}
                    width={34}
                    height={34}
                    alignItems="center"
                    justifyContent="center"
                    borderRadius={17}
                    backgroundColor="$surface"
                    pressStyle={{ opacity: 0.7 }}
                  >
                    <MaterialIcons name="close" size={18} color={ink} />
                  </XStack>
                </XStack>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {images.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <XStack gap={8} paddingBottom={10}>
                        {images.map((item) => (
                          <AppImage
                            key={item.url}
                            source={{ uri: item.url }}
                            style={{ width: 120, height: 90, borderRadius: 10 }}
                          />
                        ))}
                      </XStack>
                    </ScrollView>
                  ) : null}
                  <Text fontSize={13.5} color="$muted" lineHeight={20}>
                    {club.club_description?.trim() || 'No description yet.'}
                  </Text>
                </ScrollView>
              </SafeAreaView>
            </YStack>
          </YStack>
        </ModalThemeScope>
      </Modal>
    </XStack>
  );
}
