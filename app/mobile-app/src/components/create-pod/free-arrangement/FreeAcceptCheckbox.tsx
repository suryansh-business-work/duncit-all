import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { FREE_POLICY_KEYS } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props<T extends FieldValues> {
  control: Control<T>;
  /** Where the form holds the acceptance (`free_accepted`). */
  name: Path<T>;
  testID: string;
}

/**
 * "I accept Duncit's policy for free pods and free venues" — the box a host
 * ticks before a free pod or a free venue can be sent, with the rule's message
 * under it. The same checkbox row as the Organizer Terms (TermsAgreement).
 */
export function FreeAcceptCheckbox<T extends FieldValues>({
  control,
  name,
  testID,
}: Readonly<Props<T>>) {
  const { color, primary } = useThemeColors();
  const { t } = useTranslation();
  const { field, fieldState } = useController({ control, name });
  const checked = field.value === true;
  const label = t(FREE_POLICY_KEYS.accept);

  return (
    <YStack gap={4}>
      <XStack
        testID={testID}
        tabIndex={0}
        role="checkbox"
        aria-label={label}
        aria-checked={checked}
        onPress={() => field.onChange(!checked)}
        gap={10}
        alignItems="flex-start"
        pressStyle={PRESS_STYLE.row}
      >
        <MaterialIcons
          name={checked ? 'check-box' : 'check-box-outline-blank'}
          size={22}
          color={checked ? primary : color}
        />
        <Text flex={1} fontSize={13} color="$color">
          {label}
        </Text>
      </XStack>
      {fieldState.error ? (
        <Text testID={`${testID}-error`} role="alert" fontSize={12} color="$danger">
          {fieldState.error.message}
        </Text>
      ) : null}
    </YStack>
  );
}
