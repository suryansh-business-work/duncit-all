import { Fragment } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import {
  adjustmentSign,
  healthBandColor,
  healthBandLabel,
  healthScoreCaption,
  type HealthScoreLike,
} from '@/utils/health';
import { formatDateTime, formatRelative } from '@/utils/date-format';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { semantic } from '@duncit/auth-tokens';

type Adjustment = HealthScoreLike['adjustments'][number];

function RemarkRow({ adjustment }: Readonly<{ adjustment: Adjustment }>) {
  const positive = adjustment.delta > 0;
  return (
    <XStack
      testID={`health-remark-${adjustment.id}`}
      gap={12}
      alignItems="center"
      paddingHorizontal={16}
      paddingVertical={14}
    >
      <XStack
        minWidth={44}
        justifyContent="center"
        borderRadius={999}
        paddingHorizontal={10}
        paddingVertical={4}
        backgroundColor={positive ? semantic.success : semantic.error}
      >
        <Text fontSize={12} fontWeight="600" color="white">
          {adjustmentSign(adjustment.delta)}
        </Text>
      </XStack>
      <YStack flex={1}>
        <Text fontSize={14} fontWeight="500" color="$color">
          {adjustment.remark}
        </Text>
        <Text fontSize={12} color="$muted">
          {adjustment.created_by_name} · {formatDateTime(adjustment.created_at)} ·{' '}
          {formatRelative(adjustment.created_at)} ago
        </Text>
      </YStack>
    </XStack>
  );
}

/** Score summary + admin remarks list — RN twin of mWeb's <HealthBreakdown/>. */
export function HealthBreakdown({ score }: Readonly<{ score: HealthScoreLike }>) {
  const bandColor = healthBandColor(score.band);

  return (
    <YStack gap={20} testID="health-breakdown">
      <SurfaceCard>
        <XStack alignItems="center" gap={16} flexWrap="wrap">
          <XStack alignItems="flex-end" gap={4}>
            <Text fontSize={40} fontWeight="700" lineHeight={42} color="$color">
              {score.total_score}
            </Text>
            <Text fontSize={12} fontWeight="500" color="$muted" marginBottom={6}>
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
              <Text fontSize={12} fontWeight="600" color="white">
                {healthBandLabel(score.band)}
              </Text>
            </XStack>
            <Text fontSize={12} color="$muted">
              {healthScoreCaption(score)}
            </Text>
          </YStack>
        </XStack>
      </SurfaceCard>

      <YStack gap={12}>
        <SectionHeader title="Admin remarks" />
        {score.adjustments.length === 0 ? (
          <SurfaceCard testID="health-no-remarks">
            <Text fontSize={14} color="$muted">
              No admin adjustments yet. Your score is the default {score.base_score}.
            </Text>
          </SurfaceCard>
        ) : (
          <SurfaceCard padding={0} overflow="hidden">
            {score.adjustments.map((adjustment, index) => (
              <Fragment key={adjustment.id}>
                {index > 0 ? <YStack height={1} backgroundColor="$borderColor" /> : null}
                <RemarkRow adjustment={adjustment} />
              </Fragment>
            ))}
          </SurfaceCard>
        )}
      </YStack>
    </YStack>
  );
}
