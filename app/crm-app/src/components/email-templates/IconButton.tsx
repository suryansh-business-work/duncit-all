import { MaterialIcons } from '@expo/vector-icons';
import { YStack, useTheme } from 'tamagui';

import { RADII } from '@/constants/design';

interface Props {
  icon: keyof typeof MaterialIcons.glyphMap;
  /** What it does, for screen readers (the portal's tooltip). */
  label: string;
  onPress: () => void;
  tone?: 'neutral' | 'accent' | 'danger';
  disabled?: boolean;
  testID?: string;
}

const COLOR = { neutral: 'color', accent: 'accentText', danger: 'danger' } as const;

/** A 44 px icon-only button — the portal's DuncitIconButton with its tooltip read out as the name. */
export function IconButton({
  icon,
  label,
  onPress,
  tone = 'neutral',
  disabled = false,
  testID,
}: Readonly<Props>) {
  const theme = useTheme();
  return (
    <YStack
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      width={44}
      height={44}
      alignItems="center"
      justifyContent="center"
      borderRadius={RADII.sm}
      opacity={disabled ? 0.4 : 1}
      pressStyle={{ backgroundColor: '$soft' }}
      testID={testID}
    >
      <MaterialIcons name={icon} size={22} color={theme[COLOR[tone]]?.val} />
    </YStack>
  );
}
