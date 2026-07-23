import { Text, XStack, YStack } from 'tamagui';

import { FieldLabel } from '@/components/Field';

export interface ChipOption {
  value: string;
  label: string;
}

interface Props {
  label: string;
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  emptyHint?: string;
  required?: boolean;
  testID: string;
}

/** A labelled wrap of selectable chips — the screen's picker control for
 * clubs, venues, venue space, mode and pod type. */
export function ChipSelectField({
  label,
  options,
  value,
  onChange,
  error,
  emptyHint,
  required,
  testID,
}: Readonly<Props>) {
  return (
    <YStack gap={6}>
      <FieldLabel label={label} required={required} testID={testID} />
      {options.length === 0 ? (
        <Text testID={`${testID}-empty`} fontSize={12.5} color="$muted">
          {emptyHint ?? 'No options available.'}
        </Text>
      ) : (
        <XStack gap={6} flexWrap="wrap">
          {options.map((option) => {
            const selected = value === option.value;
            return (
              <XStack
                key={option.value}
                testID={`${testID}-${option.value}`}
                role="button"
                aria-label={option.label}
                aria-pressed={selected}
                onPress={() => onChange(option.value)}
                paddingHorizontal={12}
                paddingVertical={7}
                borderRadius={999}
                borderWidth={1}
                borderColor={selected ? '$primary' : '$borderColor'}
                backgroundColor={selected ? '$primary' : 'transparent'}
                pressStyle={{ opacity: 0.85 }}
              >
                <Text fontSize={12.5} fontWeight="800" color={selected ? '$onPrimary' : '$color'}>
                  {option.label}
                </Text>
              </XStack>
            );
          })}
        </XStack>
      )}
      {error ? (
        <Text testID={`${testID}-error`} fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
