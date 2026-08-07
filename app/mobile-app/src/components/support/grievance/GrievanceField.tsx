import { Controller, type Control } from 'react-hook-form';
import { Input, Text, TextArea, YStack } from 'tamagui';

import type { GrievanceValues } from './grievance.types';

interface Props {
  name: keyof GrievanceValues;
  label: string;
  control: Control<GrievanceValues>;
  /** Caption under the field when there is no error — hint or "Optional". */
  hint?: string;
  multiline?: boolean;
}

/**
 * One labelled grievance field — the RN counterpart of mWeb's RhfTextField.
 *
 * The error replaces the hint rather than sitting beside it, exactly as it
 * does on mWeb, so a field never shows two captions at once.
 */
export function GrievanceField({ name, label, control, hint, multiline }: Readonly<Props>) {
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
            </Text>
            {multiline ? (
              <TextArea
                testID={`grievance-${name}`}
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
                testID={`grievance-${name}`}
                aria-label={label}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                borderRadius={12}
                borderColor={borderColor}
              />
            )}
            {fieldState.error ? (
              <Text fontSize={11} color="$danger" testID={`grievance-${name}-error`}>
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
