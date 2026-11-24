import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Input, Label, Text, TextArea, YStack } from 'tamagui';

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  hint?: string;
  placeholder?: string;
  secure?: boolean;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad';
  autoComplete?: 'email' | 'password' | 'one-time-code' | 'off';
  testID?: string;
}

/**
 * A react-hook-form text box with its label, hint and field error — announced
 * to screen readers, and tied to its label for touch and TalkBack alike.
 */
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  placeholder,
  secure,
  multiline,
  keyboardType = 'default',
  autoComplete = 'off',
  testID,
}: Readonly<Props<T>>) {
  const { field, fieldState } = useController({ control, name });
  const id = `field-${name}`;
  const error = fieldState.error?.message;
  const shared = {
    id,
    value: typeof field.value === 'string' ? field.value : '',
    onChangeText: field.onChange,
    onBlur: field.onBlur,
    placeholder,
    'aria-label': label,
    'aria-invalid': Boolean(error),
    borderColor: error ? '$danger' : '$inputBorder',
    testID,
  } as const;
  return (
    <YStack gap="$1">
      <Label htmlFor={id} fontWeight="600">
        {label}
      </Label>
      {multiline ? (
        <TextArea {...shared} minHeight={110} />
      ) : (
        <Input
          {...shared}
          secureTextEntry={secure}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          autoCapitalize={keyboardType === 'email-address' || secure ? 'none' : 'sentences'}
        />
      )}
      {error ? (
        <Text color="$danger" fontSize="$2" role="alert" testID={testID ? `${testID}-error` : undefined}>
          {error}
        </Text>
      ) : null}
      {!error && hint ? (
        <Text color="$muted" fontSize="$2">
          {hint}
        </Text>
      ) : null}
    </YStack>
  );
}
