import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';

export type NoticeTone = 'info' | 'warning' | 'error' | 'success';

const TONES: Record<
  NoticeTone,
  {
    soft: '$infoSoft' | '$warningSoft' | '$dangerSoft' | '$successSoft';
    ink: 'info' | 'warning' | 'danger' | 'success';
    text: '$info' | '$warning' | '$danger' | '$success';
    icon: keyof typeof MaterialIcons.glyphMap;
  }
> = {
  info: { soft: '$infoSoft', ink: 'info', text: '$info', icon: 'info-outline' },
  warning: { soft: '$warningSoft', ink: 'warning', text: '$warning', icon: 'warning-amber' },
  error: { soft: '$dangerSoft', ink: 'danger', text: '$danger', icon: 'error-outline' },
  success: { soft: '$successSoft', ink: 'success', text: '$success', icon: 'check-circle-outline' },
};

interface Props {
  tone: NoticeTone;
  children: ReactNode;
  /** Shown as a close button when given. */
  onClose?: () => void;
  testID?: string;
}

/**
 * The portal's Alert on a phone: a soft box in its tone with an icon. Errors
 * are announced at once; the other tones politely, when they change.
 */
export function Notice({ tone, children, onClose, testID }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const look = TONES[tone];
  const ink = theme[look.ink]?.val;
  return (
    <XStack
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      gap="$2"
      alignItems="flex-start"
      backgroundColor={look.soft}
      borderRadius={RADII.sm}
      padding="$3"
      testID={testID}
    >
      <MaterialIcons name={look.icon} size={20} color={ink} accessibilityElementsHidden />
      <YStack flex={1} gap="$1">
        {typeof children === 'string' ? <Text color={look.text}>{children}</Text> : children}
      </YStack>
      {onClose ? (
        <YStack
          role="button"
          aria-label={t('shell.common.close')}
          onPress={onClose}
          padding="$1"
          hitSlop={12}
          testID={testID ? `${testID}-close` : undefined}
        >
          <MaterialIcons name="close" size={18} color={ink} />
        </YStack>
      ) : null}
    </XStack>
  );
}
