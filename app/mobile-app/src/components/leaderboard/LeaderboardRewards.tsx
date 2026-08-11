import { MaterialIcons } from '@expo/vector-icons';
import { Separator, Text, XStack, YStack } from 'tamagui';

import type { LeaderboardCategory } from '@duncit/utils';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeaderboardConfigShape, LeaderboardRewardShape } from './types';

function RewardRow({ reward }: Readonly<{ reward: LeaderboardRewardShape }>) {
  const { t } = useTranslation();
  const rankLabel =
    reward.rank_from === reward.rank_to
      ? t('mweb.leaderboard.rewardRankOne', { vars: { from: reward.rank_from } })
      : t('mweb.leaderboard.rewardRankRange', {
          vars: { from: reward.rank_from, to: reward.rank_to },
        });
  return (
    <XStack gap={12} alignItems="flex-start">
      <XStack
        paddingHorizontal={10}
        paddingVertical={4}
        borderRadius={999}
        backgroundColor="$background"
      >
        <Text fontSize={12} fontWeight="700" color="$color">
          {rankLabel}
        </Text>
      </XStack>
      <YStack flex={1} gap={2}>
        <Text fontSize={13} fontWeight="700" color="$color">
          {reward.title}
        </Text>
        {reward.description !== '' ? (
          <Text fontSize={11} color="$muted">
            {reward.description}
          </Text>
        ) : null}
      </YStack>
    </XStack>
  );
}

function RewardGroup({
  title,
  rewards,
}: Readonly<{ title: string; rewards: LeaderboardRewardShape[] }>) {
  if (rewards.length === 0) return null;
  return (
    <YStack gap={8}>
      <Text
        fontSize={11}
        fontWeight="700"
        textTransform="uppercase"
        letterSpacing={0.6}
        color="$muted"
      >
        {title}
      </Text>
      {rewards.map((reward) => (
        <RewardRow
          key={`${reward.period}-${reward.rank_from}-${reward.rank_to}-${reward.title}`}
          reward={reward}
        />
      ))}
    </YStack>
  );
}

/** The prizes promised for this board — month-end and year-end, admin-curated;
 * RN twin of mWeb's <RewardsCard/>. */
export function LeaderboardRewards({
  config,
  category,
}: Readonly<{ config: LeaderboardConfigShape; category: LeaderboardCategory }>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  const rewards = config.rewards.filter((reward) => reward.category === category);
  const monthly = rewards.filter((reward) => reward.period === 'MONTHLY');
  const yearly = rewards.filter((reward) => reward.period === 'YEARLY');

  return (
    <YStack
      testID="leaderboard-rewards"
      marginHorizontal={16}
      padding={16}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      gap={12}
    >
      <XStack alignItems="center" gap={8}>
        <MaterialIcons name="card-giftcard" size={20} color={primary} />
        <YStack gap={2} flex={1}>
          <Text fontSize={15} fontWeight="700" color="$color">
            {t('mweb.leaderboard.rewardsTitle')}
          </Text>
          <Text fontSize={11} color="$muted">
            {t('mweb.leaderboard.rewardsSubtitle')}
          </Text>
        </YStack>
      </XStack>
      {rewards.length === 0 ? (
        <Text fontSize={13} color="$muted">
          {t('mweb.leaderboard.rewardsEmpty')}
        </Text>
      ) : (
        <YStack gap={12}>
          <RewardGroup title={t('mweb.leaderboard.rewardsMonthly')} rewards={monthly} />
          {monthly.length > 0 && yearly.length > 0 ? (
            <Separator borderColor="$borderColor" />
          ) : null}
          <RewardGroup title={t('mweb.leaderboard.rewardsYearly')} rewards={yearly} />
        </YStack>
      )}
    </YStack>
  );
}
