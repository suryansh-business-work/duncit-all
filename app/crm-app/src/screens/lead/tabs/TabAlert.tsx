import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';

type Tone = 'danger' | 'warning' | 'info' | 'success';

const SOFT: Record<Tone, string> = {
  danger: '$dangerSoft',
  warning: '$warningSoft',
  info: '$infoSoft',
  success: '$successSoft',
};

interface Props {
  tone: Tone;
  children: ReactNode;
  /** Shows a close button that dismisses the message. */
  onClose?: () => void;
  testID?: string;
}

/** A message box in the tab — the portal's Alert: an error, a warning or a note, dismissible when it can be. */
export function TabAlert({ tone, children, onClose, testID }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const urgent = tone === 'danger' || tone === 'warning';
  return (
    <XStack
      role={urgent ? 'alert' : undefined}
      backgroundColor={SOFT[tone]}
      borderRadius={RADII.md}
      padding="$3"
      gap="$2"
      alignItems="flex-start"
      testID={testID}
    >
      <YStack flex={1} gap="$1">
        {typeof children === 'string' ? <Text color={`$${tone}`}>{children}</Text> : children}
      </YStack>
      {onClose ? (
        <XStack
          role="button"
          aria-label={t('shell.common.close')}
          onPress={onClose}
          padding="$1"
          hitSlop={12}
          testID={testID ? `${testID}-close` : undefined}
        >
          <MaterialIcons name="close" size={20} color={theme.muted?.val} />
        </XStack>
      ) : null}
    </XStack>
  );
}
