import type { TextInputProps } from 'react-native';
import { Input } from 'tamagui';

import { Field } from '@/components/Field';

type PassthroughProps = Pick<
  TextInputProps,
  'keyboardType' | 'placeholder' | 'multiline' | 'maxLength'
>;

export interface LabeledInputProps extends PassthroughProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Muted helper under the box when there is no error. */
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  testID: string;
}

/**
 * A labelled text box for state that is NOT in react-hook-form — a draft the
 * screen validates itself against a live clock, a filter, a price to apply in
 * bulk. Same `<Field>` shell and the same box as `FormTextField`, so the two
 * look identical; only the binding differs (rule 34).
 */
export function LabeledInput({
  label,
  value,
  onChangeText,
  hint,
  error,
  required,
  disabled = false,
  testID,
  ...inputProps
}: Readonly<LabeledInputProps>) {
  return (
    <Field label={label} required={required} hint={hint} error={error} testID={testID}>
      <Input
        testID={`field-${testID}`}
        size="$4"
        backgroundColor="$surface"
        color="$color"
        placeholderTextColor="$muted"
        borderColor={error ? '$danger' : '$borderColor'}
        focusStyle={{ borderColor: error ? '$danger' : '$primary', borderWidth: 1.5 }}
        value={value}
        onChangeText={onChangeText}
        // Tamagui's <Input> recomputes `editable` after spreading props, so
        // `readOnly` is the prop it honours for a locked box.
        readOnly={disabled}
        opacity={disabled ? 0.5 : 1}
        aria-label={label}
        {...inputProps}
      />
    </Field>
  );
}
