import { Controller, type Control } from 'react-hook-form';
import { Input, Text, TextArea, YStack } from 'tamagui';

import { RequiredMark } from '@/components/Field';
import type { GrievanceValues } from './grievance.types';

interface Props {
  name: keyof GrievanceValues;
  label: string;
  control: Control<GrievanceValues>;
  /** Caption under the field when there is no error — hint or "Optional". */
  hint?: string;
  /** Marks the label with the red `*`, matching mWeb's MUI asterisk. */
  required?: boolean;
  multiline?: boolean;
}

/**
 * One labelled grievance field — the RN counterpart of mWeb's RhfTextField.
 *
 * The error replaces the hint rather than sitting beside it, exactly as it
 * does on mWeb, so a field never shows two captions at once.
 */
export function GrievanceField({
  name,
  label,
  control,
  hint,
  required,
  multiline,
}: Readonly<Props>) {
  const testID = `grievance-${name}`;
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const borderColor = fieldState.error ? '$danger' : '$borderColor';
        return (
          <YStack gap={4}>
            <Text fontSize={11.5} fontWeight="600" color="$muted">
              {label}
              <RequiredMark required={required} testID={testID} />
            </Text>
            {multiline ? (
              <TextArea
                testID={testID}
                aria-label={label}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                minHeight={96}
                borderRadius={12}
                borderColor={borderColor}
              />
            ) : (
              <Input
                testID={testID}
                aria-label={label}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                borderRadius={12}
                borderColor={borderColor}
              />
            )}
            {fieldState.error ? (
              <Text fontSize={11} color="$danger" testID={`${testID}-error`}>
                {fieldState.error.message}
              </Text>
            ) : (
              hint && (
                <Text fontSize={11} color="$muted">
                  {hint}
                </Text>
              )
            )}
          </YStack>
        );
      }}
    />
  );
}
