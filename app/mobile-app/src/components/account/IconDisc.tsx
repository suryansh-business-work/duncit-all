import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

type IconName = ComponentProps<typeof MaterialIcons>['name'];
type Tone = 'accent' | 'danger' | 'muted';

interface Props {
  icon: IconName;
  /** Outer diameter. */
  size?: number;
  /** `accent` for a feature icon, `danger` for the destructive row. */
  tone?: Tone;
}

/**
 * The round soft disc a settings/list row leads with — the calm design's one
 * icon treatment across Profile, Account and the preference screens.
 * mWeb twin: pages/account-page/IconDisc.
 */
export function IconDisc({ icon, size = 36, tone = 'accent' }: Readonly<Props>) {
  const colors = useThemeColors();
  const tint: Record<Tone, string> = {
    accent: colors.accent,
    danger: colors.danger,
    muted: colors.muted,
  };
  return (
    <YStack
      width={size}
      height={size}
      borderRadius={size / 2}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$soft"
      flexShrink={0}
    >
      <MaterialIcons name={icon} size={Math.round(size * 0.55)} color={tint[tone]} />
    </YStack>
  );
}
