import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import {
  LEADERBOARD_CATEGORIES,
  LEADERBOARD_EARN_KEY,
  LEADERBOARD_POINTS_FIELD,
  type LeaderboardCategory,
} from '@duncit/utils';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeaderboardConfigShape } from './types';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

const EARN_ICON: Record<LeaderboardCategory, IconName> = {
  USER: 'group-add',
  HOST: 'star-border',
  CLUB_ADMIN: 'groups',
  VENUE: 'storefront',
  BRAND: 'shopping-bag',
};

/** "How to increase your points" — one line per board, priced live from
 * `leaderboardConfig`; RN twin of mWeb's <HowToEarnCard/>. */
export function LeaderboardHowToEarn({ config }: Readonly<{ config: LeaderboardConfigShape }>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  // A 0-point action is switched off — promising it would be a lie.
  const active = LEADERBOARD_CATEGORIES.filter(
    (category) => (config[LEADERBOARD_POINTS_FIELD[category]] ?? 0) > 0,
  );
  if (active.length === 0) return null;

  return (
    <YStack
      testID="leaderboard-how-to-earn"
      marginHorizontal={16}
      padding={16}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      gap={12}
    >
      <YStack gap={2}>
        <Text fontSize={15} fontWeight="700" color="$color">
          {t('mweb.leaderboard.howToTitle')}
        </Text>
        <Text fontSize={11} color="$muted">
          {t('mweb.leaderboard.howToSubtitle')}
        </Text>
      </YStack>
      {active.map((category) => (
        <XStack key={category} alignItems="center" gap={12}>
          <MaterialIcons name={EARN_ICON[category]} size={20} color={primary} />
          <Text flex={1} fontSize={13} color="$color">
            {t(LEADERBOARD_EARN_KEY[category])}
          </Text>
          <XStack
            paddingHorizontal={10}
            paddingVertical={4}
            borderRadius={999}
            borderWidth={1}
            borderColor="$primary"
          >
            <Text fontSize={12} fontWeight="700" color="$primary">
              {t('mweb.leaderboard.earnPoints', {
                vars: { points: config[LEADERBOARD_POINTS_FIELD[category]] },
              })}
            </Text>
          </XStack>
        </XStack>
      ))}
    </YStack>
  );
}
