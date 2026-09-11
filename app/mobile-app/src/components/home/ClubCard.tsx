import { AppImage } from '@/components/AppImage';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { coverImageUrl } from '@duncit/utils';

import { PressScale } from '@/animations/PressScale';
import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { HomeClub } from '@/hooks/useHomeFeed';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  club: HomeClub;
  /** The club's live pods — the muted count beside its name. */
  podCount?: number;
  onPress?: () => void;
}

/** A club on the Clubs tab: the cover inside the card's padding, the name, a
 * muted pod count and a green Open pill. mWeb twin: clubs-page/ClubListCard. */
export function ClubCard({ club, podCount = 0, onPress }: Readonly<Props>) {
  const { t } = useTranslation();
  const { accent, onPrimary } = useThemeColors();
  const image = coverImageUrl(club.club_feature_images_and_videos) ?? null;

  return (
    <PressScale
      testID={`club-card-${club.club_id}`}
      accessibilityLabel={club.club_name}
      onPress={onPress}
    >
      <SurfaceCard padding={12}>
        <YStack
          height={154}
          borderRadius={18}
          overflow="hidden"
          backgroundColor="$soft"
          alignItems="center"
          justifyContent="center"
        >
          {image ? (
            <AppImage
              source={{ uri: image }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <MaterialIcons name="groups" size={40} color={accent} />
          )}
        </YStack>
        <YStack gap={4} paddingTop={12}>
          <XStack gap={8} alignItems="baseline">
            <Text flex={1} fontSize={16} fontWeight="600" color="$color" numberOfLines={1}>
              {club.club_name}
            </Text>
            <Text fontSize={12} fontWeight="500" color="$muted">
              {t('mweb.clubsPage.podCount', { count: podCount })}
            </Text>
          </XStack>
          {club.club_description ? (
            <Text fontSize={14} lineHeight={20} minHeight={40} color="$muted" numberOfLines={2}>
              {club.club_description}
            </Text>
          ) : null}
        </YStack>
        <YStack marginTop={12}>
          <DuncitButton
            fullWidth
            label={t('mweb.clubsPage.openClub')}
            onPress={() => onPress?.()}
            iconAfter={<MaterialIcons name="arrow-forward" size={18} color={onPrimary} />}
          />
        </YStack>
      </SurfaceCard>
    </PressScale>
  );
}
