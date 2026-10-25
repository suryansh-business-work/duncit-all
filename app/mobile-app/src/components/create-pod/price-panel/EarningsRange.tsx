import { Text, XStack, YStack } from 'tamagui';
import { moneyRangeText } from '@duncit/utils';

import type { PodEarningsProjection } from '@/hooks/usePotentialEarnings';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  projection: PodEarningsProjection;
  money: (rupees: number) => string;
}

/**
 * The host's take-home as a range when the pod books a venue offer that is
 * paid for at least the venue's minimum guests: from that minimum (tickets for
 * that many, the venue's cost at its minimum taken off) up to every spot sold.
 * Both ends are the server's own projections (`potentialPodEarnings` and its
 * `minimum`). A low end at or below ₹0 is said, never blocked — the server only
 * refuses a pod that earns nothing at all its spots. mWeb twin: EarningsRange.
 */
export function EarningsRange({ projection, money }: Readonly<Props>) {
  const { t } = useTranslation();
  const { minimum } = projection;
  if (!minimum) return null;
  const atFewest = minimum.waterfall.host_receives;
  const atMost = projection.waterfall.host_receives;
  const spots = { min: minimum.total_spots, max: projection.total_spots };

  return (
    <YStack gap={4} testID="price-panel-earnings-range" aria-live="polite">
      <XStack justifyContent="space-between" gap={12}>
        <Text fontSize={14} fontWeight="700" color="$color" flexShrink={1}>
          {t('mweb.createPod.earningsRange.title')}
        </Text>
        <Text
          testID="price-panel-earnings-range-value"
          fontSize={14}
          fontWeight="700"
          color="$success"
        >
          {moneyRangeText(Math.min(atFewest, atMost), Math.max(atFewest, atMost), money)}
        </Text>
      </XStack>
      <Text fontSize={12} color="$muted">
        {t('mweb.createPod.earningsRange.hint', { vars: spots })}
      </Text>
      {atFewest <= 0 ? (
        <Text testID="price-panel-earnings-range-low" role="alert" fontSize={12} color="$warning">
          {t('mweb.createPod.earningsRange.lowWarning', { vars: { min: spots.min } })}
        </Text>
      ) : null}
    </YStack>
  );
}
