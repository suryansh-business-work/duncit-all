import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import {
  LEADERBOARD_CATEGORIES,
  LEADERBOARD_EARN_KEY,
  LEADERBOARD_POINTS_FIELD,
  type LeaderboardCategory,
} from '@duncit/utils';
import { IconDisc } from '@/components/account/IconDisc';
import { SurfaceCard } from '@/components/SurfaceCard';
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
  // A 0-point action is switched off — promising it would be a lie.
  const active = LEADERBOARD_CATEGORIES.filter(
    (category) => (config[LEADERBOARD_POINTS_FIELD[category]] ?? 0) > 0,
  );
  if (active.length === 0) return null;

  return (
    <SurfaceCard testID="leaderboard-how-to-earn" marginHorizontal={16} gap={12}>
      <Text accessibilityRole="header" fontSize={17} fontWeight="600" color="$color">
        {t('mweb.leaderboard.howToTitle')}
      </Text>
      {active.map((category) => (
        <XStack key={category} alignItems="center" gap={12}>
          <IconDisc icon={EARN_ICON[category]} />
          <Text flex={1} fontSize={14} fontWeight="500" color="$color">
            {t(LEADERBOARD_EARN_KEY[category])}
          </Text>
          <XStack
            paddingHorizontal={10}
            height={24}
            alignItems="center"
            borderRadius={999}
            backgroundColor="$primarySoft"
          >
            <Text fontSize={12} fontWeight="600" color="$primary">
              {t('mweb.leaderboard.earnPoints', {
                vars: { points: config[LEADERBOARD_POINTS_FIELD[category]] },
              })}
            </Text>
          </XStack>
        </XStack>
      ))}
    </SurfaceCard>
  );
}
