import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

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
  const { field } = useController({ control, name });
  const { primary, color } = useThemeColors();
  const checked = !!field.value;

  return (
    <XStack
      testID={testID}
      role="checkbox"
      aria-label={label}
      aria-checked={checked}
      onPress={() => field.onChange(!checked)}
      alignItems="center"
      gap={10}
      pressStyle={{ opacity: 0.8 }}
    >
      <MaterialIcons
        name={checked ? 'check-box' : 'check-box-outline-blank'}
        size={22}
        color={checked ? primary : color}
      />
      <Text fontSize={13.5} color="$color">
        {label}
      </Text>
    </XStack>
  );
}
