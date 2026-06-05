import { Text, XStack, YStack } from 'tamagui';

import {
  adjustmentSign,
  healthBandColor,
  healthBandLabel,
  healthScoreCaption,
  type HealthScoreLike,
} from '@/utils/health';
import { formatDateTime, formatRelative } from '@/utils/date-format';
import { semantic } from '@duncit/auth-tokens';

/** Score summary + admin remarks list — RN twin of mWeb's <HealthBreakdown/>. */
export function HealthBreakdown({ score }: { score: HealthScoreLike }) {
  const bandColor = healthBandColor(score.band);

  return (
    <YStack gap={16} testID="health-breakdown">
      <YStack
        borderRadius={14}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
        padding={16}
      >
        <XStack alignItems="center" gap={16} flexWrap="wrap">
          <XStack alignItems="flex-end" gap={2}>
            <Text fontSize={40} fontWeight="900" lineHeight={42} color="$color">
              {score.total_score}
            </Text>
            <Text fontSize={12} color="$muted" marginBottom={6}>
              / 100
            </Text>
          </XStack>
          <YStack flex={1} minWidth={180} gap={4}>
            <XStack
              alignSelf="flex-start"
              borderRadius={999}
              paddingHorizontal={10}
              paddingVertical={3}
              backgroundColor={bandColor}
            >
              <Text fontSize={12} fontWeight="800" color="white">
                {healthBandLabel(score.band)}
              </Text>
            </XStack>
            <Text fontSize={12} color="$muted">
              {healthScoreCaption(score)}
            </Text>
          </YStack>
        </XStack>
      </YStack>

      <YStack gap={8}>
        <Text fontSize={12} fontWeight="900" textTransform="uppercase" color="$muted">
          Admin remarks
        </Text>
        {score.adjustments.length === 0 ? (
          <YStack
            testID="health-no-remarks"
            borderRadius={12}
            borderWidth={1}
            borderColor="$borderColor"
            backgroundColor="$surface"
            padding={14}
          >
            <Text fontSize={13} color="$muted">
              No admin adjustments yet. Your score is the default {score.base_score}.
            </Text>
          </YStack>
        ) : (
          score.adjustments.map((adjustment) => {
            const positive = adjustment.delta > 0;
            return (
              <XStack
                key={adjustment.id}
                testID={`health-remark-${adjustment.id}`}
                gap={12}
                alignItems="center"
                borderRadius={12}
                borderWidth={1}
                borderColor="$borderColor"
                backgroundColor="$surface"
                padding={12}
              >
                <XStack
                  borderRadius={999}
                  paddingHorizontal={10}
                  paddingVertical={4}
                  backgroundColor={positive ? semantic.success : semantic.error}
                >
                  <Text fontSize={12} fontWeight="900" color="white">
                    {adjustmentSign(adjustment.delta)}
                  </Text>
                </XStack>
                <YStack flex={1}>
                  <Text fontSize={14} color="$color">
                    {adjustment.remark}
                  </Text>
                  <Text fontSize={11} color="$muted">
                    {adjustment.created_by_name} · {formatDateTime(adjustment.created_at)} ·{' '}
                    {formatRelative(adjustment.created_at)} ago
                  </Text>
                </YStack>
              </XStack>
            );
          })
        )}
      </YStack>
    </YStack>
  );
}
