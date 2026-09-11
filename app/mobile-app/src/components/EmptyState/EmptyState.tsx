import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { useThemeColors } from '@/hooks/useThemeColors';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface Props {
  /** The one icon — drawn muted on a soft disc. */
  icon: IconName;
  /** The one line the empty state says. */
  title: string;
  testID: string;
  /** Optional green CTA; needs `onAction`. */
  actionLabel?: string;
  onAction?: () => void;
  actionTestID?: string;
}

/**
 * The calm empty state every list shares: one icon on a soft disc, one line,
 * an optional green pill. mWeb twin: components/EmptyState.
 */
export function EmptyState({
  icon,
  title,
  testID,
  actionLabel,
  onAction,
  actionTestID,
}: Readonly<Props>) {
  const { muted } = useThemeColors();
  return (
    <YStack
      testID={testID}
      alignItems="center"
      gap={16}
      paddingVertical={48}
      paddingHorizontal={24}
    >
      <YStack
        width={72}
        height={72}
        borderRadius={36}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$soft"
      >
        <MaterialIcons name={icon} size={36} color={muted} />
      </YStack>
      <Text fontSize={16} fontWeight="600" color="$color" textAlign="center">
        {title}
      </Text>
      {actionLabel && onAction ? (
        <DuncitButton testID={actionTestID} label={actionLabel} onPress={onAction} size="lg" />
      ) : null}
    </YStack>
  );
}
