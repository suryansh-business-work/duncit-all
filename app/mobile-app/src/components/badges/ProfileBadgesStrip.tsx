import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { sortBadgeProgress } from '@duncit/utils';
import { useBadges } from '@/hooks/useBadges';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { PRESS_STYLE } from '@duncit/buttons-native';

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
  const { primary } = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { rows } = useBadges();
  const earned = sortBadgeProgress(rows).filter((row) => row.achieved);

  return (
    <YStack
      testID="profile-badges"
      gap={12}
      marginHorizontal={16}
      padding={14}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <XStack alignItems="center" gap={8}>
        <MaterialIcons name="military-tech" size={20} color={primary} />
        <Text flex={1} fontSize={16} fontWeight="700" color="$color">
          {t('mweb.profile.badges')}
        </Text>
        <Text
          testID="profile-badges-view-all"
          role="button"
          onPress={() => navigation.navigate('Badges')}
          fontSize={13}
          fontWeight="700"
          color="$primary"
          pressStyle={PRESS_STYLE.row}
        >
          {t('mweb.badges.viewAll')}
        </Text>
      </XStack>
      {earned.length === 0 ? (
        <Text fontSize={13} color="$muted">
          {t('mweb.badges.profileEmpty')}
        </Text>
      ) : (
        <XStack gap={14} flexWrap="wrap">
          {earned.map((row) => (
            <YStack key={row.badge.id} width={72} alignItems="center" gap={4}>
              {row.badge.image_url ? (
                <Image
                  source={{ uri: row.badge.image_url }}
                  style={{ width: 48, height: 48, borderRadius: 24 }}
                />
              ) : (
                <YStack
                  width={48}
                  height={48}
                  borderRadius={24}
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor="$borderColor"
                >
                  <MaterialIcons name="emoji-events" size={24} color={primary} />
                </YStack>
              )}
              <Text fontSize={11} fontWeight="700" color="$color" textAlign="center">
                {row.badge.title}
              </Text>
            </YStack>
          ))}
        </XStack>
      )}
    </YStack>
  );
}
