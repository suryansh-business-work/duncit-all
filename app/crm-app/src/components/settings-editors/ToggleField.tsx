import { Controller, type Control, type FieldPathByValue, type FieldValues } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';

import { Toggle } from '@/components/Toggle';

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: FieldPathByValue<T, boolean>;
  label: string;
  /** What switching it on means. */
  hint?: string;
  testID: string;
}

/** A yes/no field of a form: the switch, its label and what it means. */
export function ToggleField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  testID,
}: Readonly<Props<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <XStack alignItems="center" gap="$3">
          <Toggle
            checked={field.value === true}
            onChange={field.onChange}
            label={label}
            testID={testID}
          />
          <YStack flex={1} gap="$0.5">
            <Text>{label}</Text>
            {hint ? (
              <Text color="$muted" fontSize="$2">
                {hint}
              </Text>
            ) : null}
          </YStack>
        </XStack>
      )}
    />
  );
}
