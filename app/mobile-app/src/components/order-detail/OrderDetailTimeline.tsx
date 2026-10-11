import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { DetailedTimelineStep, OrderScan } from '@duncit/utils';

import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

type IconName = ComponentProps<typeof MaterialIcons>['name'];
type Colors = Readonly<{ primary: string; accent: string; muted: string; danger: string }>;

/** The dot a step wears, and the words a screen reader hears for it. */
function stepDot(
  step: DetailedTimelineStep,
  colors: Colors,
): { name: IconName; color: string; stateKey: string } {
  if (step.current) {
    const stateKey = 'mweb.orderDetail.stepCurrent';
    // Where an order stopped: a failure in red, a cancellation muted.
    if (step.tone === 'failed') return { name: 'cancel', color: colors.danger, stateKey };
    if (step.status === 'CANCELLED') return { name: 'cancel', color: colors.muted, stateKey };
    if (step.tone === 'done') return { name: 'check-circle', color: colors.primary, stateKey };
    return { name: 'radio-button-checked', color: colors.accent, stateKey };
  }
  if (step.done) {
    return { name: 'check-circle', color: colors.primary, stateKey: 'mweb.orderDetail.stepDone' };
  }
  return {
    name: 'radio-button-unchecked',
    color: colors.muted,
    stateKey: 'mweb.orderDetail.stepUpcoming',
  };
}

/** "Hyderabad Hub · Bag received" — whichever of the two the courier gave. */
const placeAndNote = (location: string, note: string) =>
  [location, note].filter(Boolean).join(' · ');

function ScanRow({ scan }: Readonly<{ scan: OrderScan }>) {
  const { formatDateTime } = useDateFormat();
  const detail = placeAndNote(scan.location, scan.note);
  return (
    <Text fontSize={11.5} color="$muted">
      {scan.at ? `${formatDateTime(scan.at)} · ` : ''}
      {scan.label}
      {detail ? ` · ${detail}` : ''}
    </Text>
  );
}

/**
 * The order's full tracking: every rung of the ladder with when it was reached,
 * and under it each courier scan — time, place and the courier's note. Ladder
 * order, first rung first. RN twin of mWeb's order-detail-page/OrderDetailTimeline.
 */
export function OrderDetailTimeline({
  steps,
  testID,
}: Readonly<{ steps: DetailedTimelineStep[]; testID?: string }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const colors = useThemeColors();
  return (
    <YStack role="list" testID={testID}>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        const icon = stepDot(step, colors);
        const reached = step.done || step.current;
        return (
          <XStack
            key={step.status}
            role="listitem"
            gap={12}
            alignItems="stretch"
            testID={`order-step-${step.status}`}
          >
            <YStack alignItems="center">
              <MaterialIcons name={icon.name} size={20} color={icon.color} />
              {last ? null : (
                <YStack
                  width={2}
                  flex={1}
                  minHeight={16}
                  marginVertical={2}
                  backgroundColor="$borderColor"
                />
              )}
            </YStack>
            <YStack flex={1} gap={2} paddingBottom={last ? 0 : 12}>
              <Text
                fontSize={13}
                fontWeight={step.current ? '700' : '500'}
                color={reached ? '$color' : '$muted'}
                aria-label={`${step.label} — ${t(icon.stateKey)}`}
              >
                {step.label}
              </Text>
              {step.at ? (
                <Text fontSize={11.5} color="$muted" testID={`order-step-at-${step.status}`}>
                  {formatDateTime(step.at)}
                </Text>
              ) : null}
              {step.scans.length === 0 && step.note ? (
                <Text fontSize={11.5} color="$muted">
                  {step.note}
                </Text>
              ) : null}
              {step.scans.length > 0 ? (
                <YStack gap={2} testID={`order-step-scans-${step.status}`}>
                  {step.scans.map((scan) => (
                    // The server stores one scan per (time, label), so the pair is the scan's identity.
                    <ScanRow
                      key={`${scan.at ?? 'untimed'}|${scan.label}|${scan.location}`}
                      scan={scan}
                    />
                  ))}
                </YStack>
              ) : null}
            </YStack>
          </XStack>
        );
      })}
    </YStack>
  );
}
