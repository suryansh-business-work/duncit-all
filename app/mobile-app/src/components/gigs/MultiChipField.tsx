import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { FieldLabel } from '@/components/Field';

export interface MultiChipOption {
  value: string;
  label: string;
}

interface Props {
  label: string;
  options: readonly MultiChipOption[];
  value: readonly string[];
  onChange: (next: string[]) => void;
  hint?: string;
  error?: string;
  required?: boolean;
  testID: string;
}

/**
 * Pick several from a fixed list — a gig's roles, a freelancer's categories
 * and skills. Same chips as ChipSelectField, but each one toggles.
 * mWeb twin: @duncit/gig-jobs ChipMultiSelect.
 */
export function MultiChipField({
  label,
  options,
  value,
  onChange,
  hint,
  error,
  required,
  testID,
}: Readonly<Props>) {
  const toggle = (option: string) =>
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);

  return (
    <YStack gap={6}>
      <FieldLabel label={label} required={required} testID={testID} />
      {hint ? (
        <Text testID={`${testID}-hint`} fontSize={12} color="$muted">
          {hint}
        </Text>
      ) : null}
      <XStack gap={8} flexWrap="wrap" role="group" aria-label={label}>
        {options.map((option) => {
          const selected = value.includes(option.value);
          return (
            <XStack
              key={option.value}
              testID={`${testID}-${option.value}`}
              tabIndex={0}
              role="checkbox"
              aria-label={option.label}
              aria-checked={selected}
              onPress={() => toggle(option.value)}
              minHeight={36}
              maxWidth="100%"
              alignItems="center"
              paddingHorizontal={14}
              borderRadius={999}
              backgroundColor={selected ? '$primary' : '$soft'}
              pressStyle={PRESS_STYLE.control}
            >
              <Text
                fontSize={13}
                fontWeight="600"
                color={selected ? '$onPrimary' : '$color'}
                numberOfLines={1}
              >
                {option.label}
              </Text>
            </XStack>
          );
        })}
      </XStack>
      {error ? (
        <Text role="alert" testID={`${testID}-error`} fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
