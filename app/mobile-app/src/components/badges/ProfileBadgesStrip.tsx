import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { sortBadgeProgress } from '@duncit/utils';
import { Skeleton, useLoadingRegion } from '@/components/Skeleton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useBadges, type BadgeProgressRow } from '@/hooks/useBadges';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { PRESS_STYLE } from '@duncit/buttons-native';

const ART_STYLE = { width: 56, height: 56, borderRadius: 28 };

/** Stable keys for the placeholder tiles shown while the first read is out. */
const PLACEHOLDER_IDS = ['first', 'second', 'third', 'fourth'];

/** Placeholder tiles in the same size and spacing as the real badges, so the
 * card does not jump when they arrive. Twin of mWeb's `BadgesStripSkeleton`. */
function BadgesStripSkeleton() {
  const region = useLoadingRegion();
  return (
    <XStack testID="profile-badges-loading" gap={12} flexWrap="wrap" {...region}>
      {PLACEHOLDER_IDS.map((id) => (
        <YStack key={id} width={72} alignItems="center" gap={6}>
          <Skeleton width={56} height={56} radius={28} />
          <Skeleton width={52} height={13} radius={4} />
        </YStack>
      ))}
    </XStack>
  );
}

interface StripBodyProps {
  isLoading: boolean;
  earned: BadgeProgressRow[];
}

function StripBody({ isLoading, earned }: Readonly<StripBodyProps>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();

  if (isLoading) return <BadgesStripSkeleton />;
  if (earned.length === 0) {
    return (
      <Text fontSize={14} color="$muted">
        {t('mweb.badges.profileEmpty')}
      </Text>
    );
  }
  return (
    <XStack gap={12} flexWrap="wrap">
      {earned.map((row) => (
        <YStack key={row.badge.id} width={72} alignItems="center" gap={6}>
          {row.badge.image_url ? (
            <Image
              source={{ uri: row.badge.image_url }}
              style={ART_STYLE}
              accessible={false}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <YStack
              width={56}
              height={56}
              borderRadius={28}
              alignItems="center"
              justifyContent="center"
              backgroundColor="$soft"
            >
              <MaterialIcons name="emoji-events" size={26} color={accent} />
            </YStack>
          )}
          <Text fontSize={13} fontWeight="600" color="$color" textAlign="center">
            {row.badge.title}
          </Text>
        </YStack>
      ))}
    </XStack>
  );
}

/**
 * The member's earned badges, shown on their own profile directly under the
 * followers/following row. Only what they have actually unlocked appears here —
 * the full catalogue, with every goal and how far along they are, lives on the
 * Badges screen this card links to.
 *
 * Tamagui twin of mWeb's <ProfileBadgesStrip/> (rule 27).
 */
export function ProfileBadgesStrip() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { rows, isLoading } = useBadges();
  const earned = sortBadgeProgress(rows).filter((row) => row.achieved);

  return (
    <SurfaceCard testID="profile-badges" gap={12} marginHorizontal={16}>
      <XStack alignItems="center" justifyContent="space-between" gap={8}>
        <Text role="heading" flexShrink={1} fontSize={17} fontWeight="600" color="$color">
          {t('mweb.profile.badges')}
        </Text>
        <Text
          testID="profile-badges-view-all"
          role="button"
          onPress={() => navigation.navigate('Badges')}
          hitSlop={10}
          fontSize={13}
          fontWeight="600"
          color="$accent"
          pressStyle={PRESS_STYLE.inline}
        >
          {t('mweb.badges.viewAll')}
        </Text>
      </XStack>
      <StripBody isLoading={isLoading} earned={earned} />
    </SurfaceCard>
  );
}
