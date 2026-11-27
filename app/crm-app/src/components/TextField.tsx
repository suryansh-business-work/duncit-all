import { useId, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Input, Label, Text, TextArea, XStack, YStack, useTheme } from 'tamagui';

import { RADII } from '@/constants/design';

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
  /**
   * 'pill' is the portal login card's field: rounded, an icon in front, the
   * label as the placeholder (still read out as the field's name).
   */
  variant?: 'boxed' | 'pill';
  icon?: keyof typeof MaterialIcons.glyphMap;
  /**
   * A number field: the value is a number (NaN while unreadable, so the schema's
   * message shows), or null when emptied if `nullable`.
   */
  numeric?: { nullable?: boolean };
  /** A control inside the field's end, e.g. show/hide password. */
  trailing?: ReactNode;
  testID?: string;
}

/** What a field shows for its value: text as is, a number as digits, nothing for none. */
const fieldText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  return typeof value === 'number' && !Number.isNaN(value) ? String(value) : '';
};

/** Typed digits to a number: blank is null (when allowed) or NaN, so a required number is refused. */
const toNumber = (text: string, nullable?: boolean): number | null => {
  if (text.trim() === '') return nullable ? null : Number.NaN;
  return Number(text);
};

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
  variant = 'boxed',
  icon,
  trailing,
  numeric,
  testID,
}: Readonly<Props<T>>) {
  const theme = useTheme();
  const { field, fieldState } = useController({ control, name });
  // Unique per field on screen: two forms with a field of the same name (one per
  // AI prompt, say) gave two inputs one id, which React Native warns about.
  const id = `field-${name}-${useId()}`;
  const error = fieldState.error?.message;
  const pill = variant === 'pill';
  const shared = {
    id,
    value: fieldText(field.value),
    onChangeText: numeric
      ? (text: string) => field.onChange(toNumber(text, numeric.nullable))
      : field.onChange,
    onBlur: field.onBlur,
    placeholder: pill ? label : placeholder,
    // The theme's muted text: still 4.5:1 on the field in light and dark mode.
    placeholderTextColor: '$muted',
    'aria-label': label,
    'aria-invalid': Boolean(error),
    testID,
  } as const;
  const input = (
    <Input
      {...shared}
      secureTextEntry={secure}
      keyboardType={keyboardType}
      autoComplete={autoComplete}
      autoCapitalize={keyboardType === 'email-address' || secure ? 'none' : 'sentences'}
      {...(pill
        ? { flex: 1, borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: '$2' }
        : { borderColor: error ? '$danger' : '$inputBorder' })}
    />
  );
  return (
    <YStack gap="$1">
      {pill ? null : (
        <Label htmlFor={id} fontWeight="600">
          {label}
        </Label>
      )}
      {multiline && !pill ? (
        <TextArea {...shared} minHeight={110} borderColor={error ? '$danger' : '$inputBorder'} />
      ) : null}
      {!multiline && !pill ? input : null}
      {pill ? (
        <XStack
          alignItems="center"
          borderWidth={1}
          borderColor={error ? '$danger' : '$inputBorder'}
          borderRadius={RADII.pill}
          backgroundColor="$surface"
          paddingLeft="$3"
          paddingRight="$1"
        >
          {icon ? (
            <MaterialIcons
              name={icon}
              size={20}
              color={theme.muted?.val}
              accessibilityElementsHidden
            />
          ) : null}
          {input}
          {trailing}
        </XStack>
      ) : null}
      {error ? (
        <Text
          color="$danger"
          fontSize="$2"
          role="alert"
          paddingHorizontal={pill ? '$3' : 0}
          testID={testID ? `${testID}-error` : undefined}
        >
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
