import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

export interface SegmentOption<T> {
  value: T;
  label: string;
  testID: string;
}

interface Props<T> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * The pill segmented control of the gift-card screens: a soft track with the
 * selected segment filled green. Drives the Buy / My cards tabs and the
 * "For myself / Send as a gift" toggle alike. mWeb twin:
 * gift-cards-page/segmentedSx (DuncitTabs + ToggleButtonGroup).
 */
export function GiftCardSegmented<T extends string | boolean>({
  options,
  value,
  onChange,
}: Readonly<Props<T>>) {
  return (
    <XStack padding={4} gap={4} borderRadius={999} backgroundColor="$soft">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <XStack
            key={option.testID}
            testID={option.testID}
            role="button"
            aria-label={option.label}
            onPress={() => onChange(option.value)}
            flex={1}
            height={40}
            alignItems="center"
            justifyContent="center"
            borderRadius={999}
            backgroundColor={isActive ? '$primary' : 'transparent'}
            pressStyle={PRESS_STYLE.control}
          >
            <Text fontSize={14} fontWeight="600" color={isActive ? '$onPrimary' : '$muted'}>
              {option.label}
            </Text>
          </XStack>
        );
      })}
    </XStack>
  );
}
