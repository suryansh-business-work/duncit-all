import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import type { TextInputProps } from 'react-native';
import { Input, Text, YStack } from 'tamagui';

/** The RN TextInput props the auth forms pass through (Tamagui's <Input> styles
 * the rest); spreading the full TextInputProps clashes with Tamagui's typing. */
type PassthroughProps = Pick<
  TextInputProps,
  | 'placeholder'
  | 'autoCapitalize'
  | 'keyboardType'
  | 'autoComplete'
  | 'textContentType'
  | 'secureTextEntry'
  | 'maxLength'
>;

export interface FormTextFieldProps<T extends FieldValues> extends PassthroughProps {
  control: Control<T>;
  name: Path<T>;
  label: string;
}

/**
 * Themed, react-hook-form-bound text input built on Tamagui's <Input>. Light/dark
 * surfaces + error states resolve from the shared theme tokens.
 */
export function FormTextField<T extends FieldValues>({
  control,
  name,
  label,
  ...inputProps
}: FormTextFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });
  const hasError = !!fieldState.error;

  return (
    <YStack gap={6}>
      <Text fontSize={14} fontWeight="500" color="$color">
        {label}
      </Text>
      <Input
        testID={`field-${name}`}
        size="$4"
        backgroundColor="$surface"
        color="$color"
        borderColor={hasError ? '$danger' : '$borderColor'}
        value={(field.value as string) ?? ''}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
        accessibilityLabel={label}
        {...inputProps}
      />
      {hasError ? (
        <Text fontSize={12} color="$danger" testID={`${name}-error`}>
          {fieldState.error?.message}
        </Text>
      ) : null}
    </YStack>
  );
}
