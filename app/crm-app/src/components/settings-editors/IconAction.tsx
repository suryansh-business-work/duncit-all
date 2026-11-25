import { MaterialIcons } from '@expo/vector-icons';
import { XStack, useTheme } from 'tamagui';

export type IconActionName = 'arrow-upward' | 'arrow-downward' | 'edit' | 'delete';

interface Props {
  icon: IconActionName;
  /** What it does to which row ("Move Instagram up"), for screen readers. */
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  testID: string;
}

/** A row's icon action (move up / down, edit, delete): a 44 pt target, named after the row (WCAG 2.5.7, 4.1.2). */
export function IconAction({
  icon,
  label,
  onPress,
  disabled = false,
  danger = false,
  testID,
}: Readonly<Props>) {
  const theme = useTheme();
  return (
    <XStack
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      opacity={disabled ? 0.4 : 1}
      padding="$2"
      hitSlop={6}
      testID={testID}
    >
      <MaterialIcons
        name={icon}
        size={20}
        color={danger ? theme.danger?.val : theme.accentText?.val}
      />
    </XStack>
  );
}
