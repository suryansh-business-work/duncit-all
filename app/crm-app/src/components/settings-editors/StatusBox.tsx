import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { RADII } from '@/constants/design';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info';

const TONE = {
  success: {
    color: '$success',
    background: '$successSoft',
    icon: 'check-circle',
    theme: 'success',
  },
  warning: { color: '$warning', background: '$warningSoft', icon: 'warning', theme: 'warning' },
  danger: { color: '$danger', background: '$dangerSoft', icon: 'error-outline', theme: 'danger' },
  info: { color: '$info', background: '$infoSoft', icon: 'info-outline', theme: 'info' },
} as const;

interface Props {
  tone: StatusTone;
  message: string;
  /** A follow-up action (e.g. Reload), shown under the message. */
  action?: ReactNode;
  testID?: string;
}

/** A changing status line in its tone (the portal's Alert): read out politely, an error at once. */
export function StatusBox({ tone, message, action, testID }: Readonly<Props>) {
  const theme = useTheme();
  const look = TONE[tone];
  return (
    <YStack
      role={tone === 'danger' ? 'alert' : 'status'}
      aria-live={tone === 'danger' ? 'assertive' : 'polite'}
      gap="$2"
      backgroundColor={look.background}
      borderRadius={RADII.sm}
      padding="$3"
      testID={testID}
    >
      <XStack gap="$2" alignItems="flex-start">
        <MaterialIcons
          name={look.icon}
          size={20}
          color={theme[look.theme]?.val}
          accessibilityElementsHidden
        />
        <Text flex={1} color={look.color} fontWeight="600">
          {message}
        </Text>
      </XStack>
      {action}
    </YStack>
  );
}
