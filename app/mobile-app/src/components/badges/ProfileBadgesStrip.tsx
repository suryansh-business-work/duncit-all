import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { sortBadgeProgress } from '@duncit/utils';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useBadges } from '@/hooks/useBadges';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { PRESS_STYLE } from '@duncit/buttons-native';

const ART_STYLE = { width: 56, height: 56, borderRadius: 28 };

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
  const { accent } = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { rows } = useBadges();
  const earned = sortBadgeProgress(rows).filter((row) => row.achieved);

  return (
    <SurfaceCard testID="profile-badges" gap={12} marginHorizontal={16}>
      <XStack alignItems="center" justifyContent="space-between" gap={8}>
        <Text
          accessibilityRole="header"
          flexShrink={1}
          fontSize={17}
          fontWeight="600"
          color="$color"
        >
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
      {earned.length === 0 ? (
        <Text fontSize={14} color="$muted">
          {t('mweb.badges.profileEmpty')}
        </Text>
      ) : (
        <XStack gap={12} flexWrap="wrap">
          {earned.map((row) => (
            <YStack key={row.badge.id} width={72} alignItems="center" gap={6}>
              {row.badge.image_url ? (
                <Image source={{ uri: row.badge.image_url }} style={ART_STYLE} />
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
      )}
    </SurfaceCard>
  );
}
