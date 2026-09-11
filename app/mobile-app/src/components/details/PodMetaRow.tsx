import type { ComponentProps, ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/**
 * One fact about a pod — when, where, what kind — as an icon in a soft disc
 * beside its text. The icon names the fact, so the row needs no caption.
 * mWeb twin: components/pod-details/PodMetaRow.
 */
export function PodMetaRow({
  icon,
  children,
  testID,
}: Readonly<{ icon: IconName; children: ReactNode; testID?: string }>) {
  const { accent } = useThemeColors();
  return (
    <XStack testID={testID} alignItems="center" gap={12}>
      <YStack
        width={36}
        height={36}
        borderRadius={18}
        backgroundColor="$soft"
        alignItems="center"
        justifyContent="center"
      >
        <MaterialIcons name={icon} size={20} color={accent} />
      </YStack>
      <YStack flex={1} gap={2}>
        {children}
      </YStack>
    </XStack>
  );
}
