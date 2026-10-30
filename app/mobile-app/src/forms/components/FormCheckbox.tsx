import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

export interface FormCheckboxProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  testID: string;
}

/**
 * RHF-bound checkbox row (icon + label) built on Tamagui — reused for the
 * checkout "same as my main address" / "save this as my main address" toggles.
 */
export function FormCheckbox<T extends FieldValues>({
  control,
  name,
  label,
  testID,
}: Readonly<FormCheckboxProps<T>>) {
  const { field, fieldState } = useController({ control, name });
  const { primary, color } = useThemeColors();
  const checked = !!field.value;
  // A box the schema requires (the signup age tick) says why it is refused.
  const error = fieldState.error?.message;

  return (
    <YStack gap={2}>
      <XStack
        testID={testID}
        role="checkbox"
        aria-label={label}
        aria-checked={checked}
        aria-invalid={!!error}
        tabIndex={0}
        onPress={() => field.onChange(!checked)}
        alignItems="center"
        gap={10}
        minHeight={44}
        pressStyle={PRESS_STYLE.control}
      >
        <MaterialIcons
          name={checked ? 'check-box' : 'check-box-outline-blank'}
          size={22}
          color={checked ? primary : color}
        />
        <Text flexShrink={1} fontSize={14} color="$color">
          {label}
        </Text>
      </XStack>
      {error ? (
        <Text testID={`${testID}-error`} role="alert" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
