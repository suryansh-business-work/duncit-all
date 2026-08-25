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
import { formatDate } from '@/utils/date-format';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { BadgeRowShape } from './types';

/** One caption/value pair — the goal and the unlock timeline read the same. */
function Line({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <YStack gap={1}>
      <Text fontSize={11} fontWeight="700" color="$muted">
        {label}
      </Text>
      <Text fontSize={13} color="$color">
        {value}
      </Text>
    </YStack>
  );
}

/**
 * One badge as the member sees it: the artwork, what the badge is, the GOAL it
 * asks for, the WINDOW that goal has to happen in, and either how far along
 * they are or the day they got there.
 *
 * Tamagui twin of mWeb's <BadgeProgressCard/> (rule 27) — both read their goal
 * and window vocabulary from @duncit/utils, so the two can never promise
 * different things for the same badge.
 */
export function BadgeProgressCard({ row }: Readonly<{ row: BadgeRowShape }>) {
  const { t } = useTranslation();
  const { primary, muted, success } = useThemeColors();
  const { badge } = row;
  const percent = badgeProgressPercent(row);
  const condition = badge.condition_type as BadgeCondition;
  const goal = t(BADGE_GOAL_KEY[condition], { vars: { target: row.target } });
  const timeline = t(BADGE_WINDOW_KEY[BADGE_WINDOW[condition]]);
  const barColor = row.achieved ? success : primary;
  const statusIcon = row.achieved ? 'check-circle' : 'lock-outline';

  return (
    <YStack
      testID={`badge-card-${badge.id}`}
      gap={10}
      padding={14}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <XStack gap={12} alignItems="flex-start">
        {/* A locked badge is drawn back rather than hidden — the point of the
            list is to show what is still there to be won. */}
        <YStack opacity={row.achieved ? 1 : 0.55}>
          {badge.image_url ? (
            <Image
              source={{ uri: badge.image_url }}
              style={{ width: 56, height: 56, borderRadius: 28 }}
            />
          ) : (
            <YStack
              width={56}
              height={56}
              borderRadius={28}
              alignItems="center"
              justifyContent="center"
              backgroundColor="$borderColor"
            >
              <MaterialIcons name="emoji-events" size={28} color={primary} />
            </YStack>
          )}
        </YStack>
        <YStack flex={1} gap={6}>
          <XStack alignItems="center" gap={6}>
            <Text fontSize={16} fontWeight="700" color="$color" flexShrink={1}>
              {badge.title}
            </Text>
            <MaterialIcons name={statusIcon} size={16} color={barColor} />
            <Text fontSize={11} fontWeight="700" color={barColor}>
              {row.achieved ? t('mweb.badges.achieved') : t('mweb.badges.locked')}
            </Text>
          </XStack>
          {badge.description ? (
            <Text fontSize={13} color="$muted">
              {badge.description}
            </Text>
          ) : null}
        </YStack>
      </XStack>

      <Line label={t('mweb.badges.goalLabel')} value={goal} />
      <Line label={t('mweb.badges.timelineLabel')} value={timeline} />

      <YStack gap={4}>
        <XStack justifyContent="space-between">
          <Text fontSize={11} fontWeight="700" color="$muted">
            {t('mweb.badges.progressLabel')}
          </Text>
          <Text fontSize={11} fontWeight="700" color="$color">
            {t('mweb.badges.progressValue', {
              vars: { current: Math.min(row.current, row.target), target: row.target },
            })}
          </Text>
        </XStack>
        <YStack height={8} borderRadius={4} backgroundColor="$borderColor" overflow="hidden">
          <YStack
            testID={`badge-bar-${badge.id}`}
            height={8}
            width={`${percent}%`}
            backgroundColor={barColor}
          />
        </YStack>
      </YStack>

      {row.achieved_at ? (
        <Text fontSize={11} color={muted}>
          {t('mweb.badges.achievedOn', { vars: { date: formatDate(row.achieved_at) } })}
        </Text>
      ) : null}
    </YStack>
  );
}
