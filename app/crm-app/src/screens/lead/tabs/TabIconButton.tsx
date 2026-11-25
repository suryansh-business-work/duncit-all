import { MaterialIcons } from '@expo/vector-icons';
import { XStack, useTheme } from 'tamagui';

type Tone = 'accent' | 'neutral' | 'danger' | 'warning' | 'muted';

interface Props {
  icon: keyof typeof MaterialIcons.glyphMap;
  /** Its screen-reader name (the portal's tooltip). */
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: Tone;
  size?: number;
  testID: string;
}

/** An icon-only action in a row (the portal's icon buttons): a 44-point target with its name for screen readers. */
export function TabIconButton({
  icon,
  label,
  onPress,
  disabled,
  tone = 'neutral',
  size = 22,
  testID,
}: Readonly<Props>) {
  const theme = useTheme();
  const color: Record<Tone, string | undefined> = {
    accent: theme.accentText?.val,
    neutral: theme.color?.val,
    danger: theme.danger?.val,
    warning: theme.warning?.val,
    muted: theme.muted?.val,
  };
  return (
    <XStack
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      onPress={disabled ? undefined : onPress}
      opacity={disabled ? 0.4 : 1}
      padding="$2"
      hitSlop={6}
      testID={testID}
    >
      <MaterialIcons name={icon} size={size} color={color[tone]} />
    </XStack>
  );
}
