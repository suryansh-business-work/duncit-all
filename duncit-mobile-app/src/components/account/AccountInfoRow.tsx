import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/** Icon + label + value row — RN port of mWeb's <AccountInfoRow/>. */
export function AccountInfoRow({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  const { color } = useThemeColors();
  return (
    <XStack alignItems="center" gap={14}>
      <YStack
        width={38}
        height={38}
        borderRadius={19}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$surface"
      >
        <MaterialIcons name={icon} size={18} color={color} />
      </YStack>
      <YStack flex={1}>
        <Text fontSize={12} color="$muted">
          {label}
        </Text>
        <Text fontSize={15} color="$color">
          {value}
        </Text>
      </YStack>
    </XStack>
  );
}
