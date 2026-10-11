import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

export interface StatementChoiceOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  /** The group's name, shown above the pills and read as the radiogroup's label. */
  label: string;
  options: readonly StatementChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  testID: string;
}

/**
 * One-of-many pills that wrap onto as many lines as they need — the Tamagui
 * stand-in for the MUI select mWeb uses for the statement period and format
 * (rule 27). Seven period presets do not fit one row on a phone.
 */
export function StatementChoice<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  testID,
}: Readonly<Props<T>>) {
  return (
    <YStack gap={8}>
      <Text fontSize={14} fontWeight="500" color="$color">
        {label}
      </Text>
      <XStack role="radiogroup" aria-label={label} flexWrap="wrap" gap={8} testID={testID}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <XStack
              key={option.value}
              testID={`${testID}-${option.value}`}
              role="radio"
              aria-label={option.label}
              aria-checked={selected}
              aria-disabled={disabled}
              tabIndex={0}
              onPress={disabled ? undefined : () => onChange(option.value)}
              minHeight={44}
              paddingHorizontal={16}
              alignItems="center"
              justifyContent="center"
              borderRadius={999}
              backgroundColor={selected ? '$primary' : '$soft'}
              opacity={disabled ? 0.6 : 1}
              pressStyle={PRESS_STYLE.control}
            >
              <Text fontSize={13} fontWeight="600" color={selected ? '$onPrimary' : '$color'}>
                {option.label}
              </Text>
            </XStack>
          );
        })}
      </XStack>
    </YStack>
  );
}
