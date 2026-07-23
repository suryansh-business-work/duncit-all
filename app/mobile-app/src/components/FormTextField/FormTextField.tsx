import { useState } from 'react';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import type { TextInputProps } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, XStack } from 'tamagui';

import { Field } from '@/components/Field';
import { useThemeColors } from '@/hooks/useThemeColors';

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
  | 'multiline'
  | 'numberOfLines'
  | 'editable'
>;

export interface FormTextFieldProps<T extends FieldValues> extends PassthroughProps {
  control: Control<T>;
  name: Path<T>;
  label: string;
  /** When true, appends a red `*` after the label to mark the field as required. */
  required?: boolean;
  /** Muted helper text shown below the field when there is no error (mirrors MUI helperText). */
  hint?: string;
}

/**
 * Themed, react-hook-form-bound text input built on Tamagui's <Input>. The
 * shared <Field> renders the label-on-top + helper/error line, so this field
 * looks identical to every other labelled input. Secure fields get a built-in
 * show/hide eye toggle, and the placeholder colour is pinned to the theme's
 * muted token so it stays legible in dark mode.
 */
export function FormTextField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  hint,
  secureTextEntry,
  ...inputProps
}: Readonly<FormTextFieldProps<T>>) {
  const { field, fieldState } = useController({ control, name });
  const { muted } = useThemeColors();
  const [visible, setVisible] = useState(false);
  const hasError = !!fieldState.error;
  const isSecure = !!secureTextEntry;

  return (
    <Field
      label={label}
      required={required}
      error={hasError ? fieldState.error?.message : undefined}
      hint={hint}
      testID={name}
    >
      <XStack position="relative" alignItems="center">
        <Input
          flex={1}
          testID={`field-${name}`}
          size="$4"
          backgroundColor="$surface"
          color="$color"
          placeholderTextColor="$muted"
          borderColor={hasError ? '$danger' : '$borderColor'}
          focusStyle={{ borderColor: hasError ? '$danger' : '$primary', borderWidth: 1.5 }}
          paddingRight={isSecure ? 44 : undefined}
          value={(field.value as string) ?? ''}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          secureTextEntry={isSecure && !visible}
          aria-label={label}
          {...inputProps}
        />
        {isSecure ? (
          <XStack
            testID={`toggle-${name}`}
            role="button"
            aria-label={visible ? 'Hide password' : 'Show password'}
            onPress={() => setVisible((v) => !v)}
            position="absolute"
            right={4}
            top={0}
            bottom={0}
            width={40}
            zIndex={1}
            alignItems="center"
            justifyContent="center"
            pressStyle={{ opacity: 0.6 }}
          >
            <MaterialIcons
              name={visible ? 'visibility-off' : 'visibility'}
              size={20}
              color={muted}
            />
          </XStack>
        ) : null}
      </XStack>
    </Field>
  );
}
