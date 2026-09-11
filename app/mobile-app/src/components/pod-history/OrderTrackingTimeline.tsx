import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { TimelineStep } from '@/utils/product-orders';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/** The dot a step wears: done (green check) / current (coral) / still to come (muted). */
function iconFor(
  step: TimelineStep,
  colors: Readonly<{ primary: string; accent: string; muted: string }>,
): { name: IconName; color: string } {
  if (step.done) return { name: 'check-circle', color: colors.primary };
  if (step.current) return { name: 'radio-button-checked', color: colors.accent };
  return { name: 'radio-button-unchecked', color: colors.muted };
}

/** Vertical fulfilment timeline over the order's step ladder, the steps joined
 * by a hairline rail — RN twin of mWeb's OrderTrackingTimeline. */
export function OrderTrackingTimeline({
  steps,
  testID,
}: Readonly<{ steps: TimelineStep[]; testID?: string }>) {
  const { primary, accent, muted } = useThemeColors();
  return (
    <YStack gap={2} testID={testID}>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        const icon = iconFor(step, { primary, accent, muted });
        return (
          <XStack key={step.status} gap={12} alignItems="flex-start">
            <YStack alignItems="center">
              <MaterialIcons name={icon.name} size={20} color={icon.color} />
              {last ? null : (
                <YStack width={2} height={18} marginVertical={2} backgroundColor="$borderColor" />
              )}
            </YStack>
            <Text
              flex={1}
              fontSize={13}
              fontWeight={step.current ? '600' : '500'}
              color={step.current ? '$color' : '$muted'}
              paddingBottom={last ? 0 : 6}
            >
              {step.label}
            </Text>
          </XStack>
        );
      })}
    </YStack>
  );
}
