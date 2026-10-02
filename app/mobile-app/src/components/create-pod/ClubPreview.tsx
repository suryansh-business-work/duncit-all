import { useState } from 'react';
import { AppImage } from '@/components/AppImage';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { CreatePodClub } from './create-pod.types';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { clubSlotsLabel } from '@duncit/utils';
import { ClubDetailsSheet } from './ClubDetailsSheet';

interface Props {
  club: CreatePodClub | null;
  /** Physical pods only — a virtual pod books no venue slot. */
  showSlots?: boolean;
}

/** Selected-club preview — photo + name with a brief "View club details" sheet
 * (gallery, description, rating, WhatsApp chats, admin contacts). Mirrors mWeb. */
export function ClubPreview({ club, showSlots = false }: Readonly<Props>) {
  const { muted, accent } = useThemeColors();
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
  const slots = clubSlotsLabel(club, t);

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
        {showSlots ? (
          <XStack alignItems="center" gap={4}>
            <MaterialIcons name="event-available" size={13} color={muted} />
            <Text
              testID="club-preview-slot-count"
              fontSize={12}
              fontWeight="500"
              color={slots.open ? '$muted' : '$warning'}
            >
              {slots.label}
            </Text>
          </XStack>
        ) : null}
        <Text
          pressStyle={PRESS_STYLE.inline}
          testID="club-preview-details"
          hitSlop={12}
          role="button"
          aria-label={t('mweb.createPod.viewClubDetails')}
          onPress={() => setOpen(true)}
          fontSize={13}
          fontWeight="600"
          color="$accent"
        >
          {t('mweb.createPod.viewClubDetails')}
        </Text>
      </YStack>

      <ClubDetailsSheet club={club} open={open} onClose={close} />
    </XStack>
  );
}
