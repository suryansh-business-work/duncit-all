import { useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { CreatePodClub } from './create-pod.types';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  club: CreatePodClub | null;
}

/** Selected-club preview — photo + name with a "View club details" dialog
 * showing the club's gallery and description. Mirrors mWeb's ClubPreview. */
export function ClubPreview({ club }: Readonly<Props>) {
  const { color: ink, muted, accent } = useThemeColors();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  if (!club) return null;
  const images = (club.club_feature_images_and_videos ?? []).filter(
    (item) => (item.type ?? 'IMAGE') === 'IMAGE',
  );
  const cover = images[0]?.url;
  const venueCount = club.matched_venues_count ?? 0;
  const venueLabel =
    venueCount === 1
      ? t('mweb.createPod.venueOne')
      : t('mweb.createPod.venueMany', { vars: { count: venueCount } });

  return (
    <XStack
      testID="club-preview"
      alignItems="center"
      gap={12}
      padding={12}
      borderRadius={16}
      backgroundColor="$soft"
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
          backgroundColor="$surface"
        >
          <MaterialIcons name="groups" size={26} color={accent} />
        </YStack>
      )}
      <YStack flex={1} gap={2}>
        <Text fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
          {club.club_name}
        </Text>
        <XStack alignItems="center" gap={4}>
          <MaterialIcons name="storefront" size={13} color={muted} />
          <Text testID="club-preview-venue-count" fontSize={12} fontWeight="500" color="$muted">
            {venueLabel}
          </Text>
        </XStack>
        <Text
          pressStyle={PRESS_STYLE.inline}
          testID="club-preview-details"
          role="button"
          aria-label={t('mweb.createPod.viewClubDetails')}
          onPress={() => setOpen(true)}
          fontSize={13}
          fontWeight="600"
          color="$primary"
        >
          {t('mweb.createPod.viewClubDetails')}
        </Text>
      </YStack>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <ModalThemeScope>
          <YStack flex={1} alignItems="center" justifyContent="center" testID="club-preview-dialog">
            <YStack
              pressStyle={PRESS_STYLE.surface}
              role="button"
              aria-label={t('mweb.auth.close')}
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
              backgroundColor="$surface"
              borderRadius={28}
              padding={20}
            >
              <SafeAreaView edges={[]} style={SHEET_SAFE_AREA}>
                <XStack
                  alignItems="center"
                  justifyContent="space-between"
                  gap={12}
                  paddingBottom={12}
                >
                  <Text fontSize={17} fontWeight="600" color="$color" numberOfLines={1} flex={1}>
                    {club.club_name}
                  </Text>
                  <XStack
                    testID="club-preview-close"
                    role="button"
                    aria-label={t('mweb.createPod.closeClubDetails')}
                    onPress={close}
                    width={40}
                    height={40}
                    alignItems="center"
                    justifyContent="center"
                    borderRadius={20}
                    backgroundColor="$soft"
                    pressStyle={PRESS_STYLE.control}
                  >
                    <MaterialIcons name="close" size={20} color={ink} />
                  </XStack>
                </XStack>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {images.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <XStack gap={8} paddingBottom={12}>
                        {images.map((item) => (
                          <AppImage
                            key={item.url}
                            source={{ uri: item.url }}
                            style={{ width: 120, height: 90, borderRadius: 18 }}
                          />
                        ))}
                      </XStack>
                    </ScrollView>
                  ) : null}
                  <Text fontSize={14} color="$muted" lineHeight={20}>
                    {club.club_description?.trim() || t('mweb.createPod.noDescription')}
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
