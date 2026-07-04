import { useState } from 'react';
import { Modal } from 'react-native';
import { AppImage } from '@/components/AppImage';

import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { UserBadge } from '@/hooks/usePublicProfile';
import { formatDate } from '@/utils/date-format';

/** Badge grid with a details sheet — RN twin of mWeb's PublicProfileBadges. */
export function PublicProfileBadges({ badges }: Readonly<{ badges: UserBadge[] }>) {
  const { onPrimary, primary, color } = useThemeColors();
  const [active, setActive] = useState<UserBadge | null>(null);
  if (badges.length === 0) return null;

  return (
    <YStack
      testID="public-profile-badges"
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      padding={16}
      gap={12}
    >
      <XStack alignItems="center" gap={6}>
        <MaterialIcons name="emoji-events" size={18} color={primary} />
        <Text fontSize={15} fontWeight="900" color="$color">
          Badges
        </Text>
        <Text fontSize={12} color="$muted">
          ({badges.length})
        </Text>
      </XStack>
      <XStack flexWrap="wrap" gap={12}>
        {badges.map((item) => (
          <YStack
            key={item.id}
            testID={`badge-${item.id}`}
            role="button"
            aria-label={item.badge?.title ?? 'Badge'}
            onPress={() => setActive(item)}
            width={72}
            alignItems="center"
            gap={4}
            pressStyle={{ opacity: 0.85 }}
          >
            <YStack
              width={48}
              height={48}
              borderRadius={24}
              overflow="hidden"
              backgroundColor="$primary"
              alignItems="center"
              justifyContent="center"
            >
              {item.badge?.image_url ? (
                <AppImage
                  source={{ uri: item.badge.image_url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <MaterialIcons name="emoji-events" size={22} color={onPrimary} />
              )}
            </YStack>
            <Text fontSize={11} fontWeight="700" color="$color" numberOfLines={1}>
              {item.badge?.title}
            </Text>
          </YStack>
        ))}
      </XStack>

      <Modal
        visible={!!active}
        transparent
        animationType="slide"
        onRequestClose={() => setActive(null)}
      >
        <ModalThemeScope>
          <YStack flex={1} testID="badge-sheet">
            <YStack
              testID="badge-sheet-backdrop"
              role="button"
              aria-label="Close"
              onPress={() => setActive(null)}
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              backgroundColor="rgba(0,0,0,0.5)"
            />
            <YStack
              position="absolute"
              left={0}
              right={0}
              bottom={0}
              backgroundColor="$background"
              borderTopLeftRadius={20}
              borderTopRightRadius={20}
            >
              <SafeAreaView edges={['bottom']}>
                <YStack padding={20} gap={10} alignItems="center">
                  <YStack
                    width={64}
                    height={64}
                    borderRadius={32}
                    overflow="hidden"
                    backgroundColor="$primary"
                    alignItems="center"
                    justifyContent="center"
                  >
                    {active?.badge?.image_url ? (
                      <AppImage
                        source={{ uri: active.badge.image_url }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <MaterialIcons name="emoji-events" size={30} color={onPrimary} />
                    )}
                  </YStack>
                  <Text fontSize={18} fontWeight="900" color="$color" textAlign="center">
                    {active?.badge?.title}
                  </Text>
                  {active?.badge?.description ? (
                    <Text fontSize={13} color="$muted" textAlign="center">
                      {active.badge.description}
                    </Text>
                  ) : null}
                  {active?.awarded_at ? (
                    <Text fontSize={12} color="$muted">
                      Awarded {formatDate(active.awarded_at)}
                    </Text>
                  ) : null}
                  <XStack
                    testID="badge-sheet-close"
                    role="button"
                    aria-label="Close"
                    onPress={() => setActive(null)}
                    marginTop={6}
                    paddingHorizontal={20}
                    paddingVertical={10}
                    borderRadius={999}
                    borderWidth={1}
                    borderColor="$borderColor"
                    pressStyle={{ opacity: 0.85 }}
                  >
                    <Text fontSize={14} fontWeight="800" color={color}>
                      Close
                    </Text>
                  </XStack>
                </YStack>
              </SafeAreaView>
            </YStack>
          </YStack>
        </ModalThemeScope>
      </Modal>
    </YStack>
  );
}
