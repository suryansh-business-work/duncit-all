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
  /**
   * Shown, not asked: the value came from the account. `readOnly` is the one
   * prop Tamagui honours on both builds — it recomputes `editable` from it on
   * native, and its web Input drops a passed `editable` altogether.
   */
  readOnly?: boolean;
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
  readOnly,
}: Readonly<Props>) {
  const testID = `grievance-${name}`;
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const borderColor = fieldState.error ? '$danger' : '$inputBorder';
        return (
          <YStack gap={4}>
            <Text fontSize={12} fontWeight="600" color="$muted">
              {label}
              <RequiredMark required={required} testID={testID} />
            </Text>
            {multiline ? (
              <TextArea
                testID={testID}
                aria-label={label}
                aria-required={required}
                aria-invalid={!!fieldState.error}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                readOnly={readOnly}
                minHeight={96}
                borderRadius={14}
                backgroundColor="$surface"
                borderColor={borderColor}
              />
            ) : (
              <Input
                testID={testID}
                aria-label={label}
                aria-required={required}
                aria-invalid={!!fieldState.error}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                readOnly={readOnly}
                borderRadius={14}
                backgroundColor="$surface"
                borderColor={borderColor}
              />
            )}
            {fieldState.error ? (
              <Text role="alert" fontSize={11} color="$danger" testID={`${testID}-error`}>
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
