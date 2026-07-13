import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { TimelineStep } from '@/utils/product-orders';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

function iconFor(step: TimelineStep, primary: string): { name: IconName; color: string } {
  if (step.done) return { name: 'check-circle', color: semantic.success };
  if (step.current) return { name: 'radio-button-checked', color: primary };
  return { name: 'radio-button-unchecked', color: '#9aa0a6' };
}

/** Vertical fulfilment timeline over the order's step ladder — RN twin of mWeb's
 * OrderTrackingTimeline. */
export function OrderTrackingTimeline({
  steps,
  testID,
}: Readonly<{ steps: TimelineStep[]; testID?: string }>) {
  const { primary } = useThemeColors();
  return (
    <YStack gap={2} testID={testID}>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        const icon = iconFor(step, primary);
        return (
          <XStack key={step.status} gap={12} alignItems="flex-start">
            <YStack alignItems="center">
              <MaterialIcons name={icon.name} size={20} color={icon.color} />
              {last ? null : (
                <YStack
                  width={2}
                  height={18}
                  marginVertical={2}
                  backgroundColor={step.done ? primary : '$borderColor'}
                />
              )}
            </YStack>
            <Text
              flex={1}
              fontSize={13}
              fontWeight={step.current ? '800' : '600'}
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
