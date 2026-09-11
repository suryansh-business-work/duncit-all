import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import {
  BADGE_GOAL_KEY,
  BADGE_WINDOW,
  BADGE_WINDOW_KEY,
  badgeProgressPercent,
  type BadgeCondition,
} from '@duncit/utils';
import { SurfaceCard } from '@/components/SurfaceCard';
import { formatDate } from '@/utils/date-format';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { BadgeRowShape } from './types';

const ART_STYLE = { width: 64, height: 64, borderRadius: 32 };

/**
 * One badge as a tile: the artwork, what the badge is, the GOAL it asks for,
 * how far along the member is, the WINDOW that goal has to happen in, and the
 * day they got there. A locked badge is drawn back on the soft fill rather than
 * hidden — the point of the grid is to show what is still there to be won.
 *
 * Tamagui twin of mWeb's <BadgeProgressCard/> (rule 27) — both read their goal
 * and window vocabulary from @duncit/utils, so the two can never promise
 * different things for the same badge.
 */
export function BadgeProgressCard({ row }: Readonly<{ row: BadgeRowShape }>) {
  const { t } = useTranslation();
  const { accent, muted, success } = useThemeColors();
  const { badge } = row;
  const percent = badgeProgressPercent(row);
  const condition = badge.condition_type as BadgeCondition;
  const goal = t(BADGE_GOAL_KEY[condition], { vars: { target: row.target } });
  const timeline = t(BADGE_WINDOW_KEY[BADGE_WINDOW[condition]]);
  const barColor = row.achieved ? '$success' : '$primary';
  const statusIcon = row.achieved ? 'check-circle' : 'lock-outline';

  return (
    <SurfaceCard testID={`badge-card-${badge.id}`} flex={1} gap={8} alignItems="center">
      <YStack opacity={row.achieved ? 1 : 0.55}>
        {badge.image_url ? (
          <Image source={{ uri: badge.image_url }} style={ART_STYLE} />
        ) : (
          <YStack
            width={64}
            height={64}
            borderRadius={32}
            alignItems="center"
            justifyContent="center"
            backgroundColor="$soft"
          >
            <MaterialIcons name="emoji-events" size={30} color={row.achieved ? accent : muted} />
          </YStack>
        )}
      </YStack>
      <Text fontSize={13} fontWeight="600" color="$color" textAlign="center">
        {badge.title}
      </Text>
      <XStack
        alignItems="center"
        gap={4}
        height={24}
        paddingHorizontal={8}
        borderRadius={999}
        backgroundColor={row.achieved ? '$successSoft' : '$soft'}
      >
        <MaterialIcons name={statusIcon} size={13} color={row.achieved ? success : muted} />
        <Text fontSize={11} fontWeight="600" color={row.achieved ? '$success' : '$muted'}>
          {row.achieved ? t('mweb.badges.achieved') : t('mweb.badges.locked')}
        </Text>
      </XStack>
      {badge.description ? (
        <Text fontSize={12} color="$muted" textAlign="center">
          {badge.description}
        </Text>
      ) : null}
      <Text fontSize={12} fontWeight="500" color="$color" textAlign="center">
        {goal}
      </Text>

      <YStack gap={4} alignSelf="stretch" marginTop="auto" paddingTop={4}>
        <YStack height={4} borderRadius={999} backgroundColor="$soft" overflow="hidden">
          <YStack
            testID={`badge-bar-${badge.id}`}
            height={4}
            borderRadius={999}
            width={`${percent}%`}
            backgroundColor={barColor}
          />
        </YStack>
        <Text fontSize={11} fontWeight="600" color="$color" textAlign="center">
          {t('mweb.badges.progressValue', {
            vars: { current: Math.min(row.current, row.target), target: row.target },
          })}
        </Text>
      </YStack>
      <Text fontSize={11} color="$muted" textAlign="center">
        {timeline}
      </Text>
      {row.achieved_at ? (
        <Text fontSize={11} color="$muted" textAlign="center">
          {t('mweb.badges.achievedOn', { vars: { date: formatDate(row.achieved_at) } })}
        </Text>
      ) : null}
    </SurfaceCard>
  );
}
