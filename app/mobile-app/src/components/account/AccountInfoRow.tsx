import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { IconDisc } from './IconDisc';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/** Icon + label + value row — RN port of mWeb's <AccountInfoRow/>. */
export function AccountInfoRow({
  icon,
  label,
  value,
}: Readonly<{
  icon: IconName;
  label: string;
  value: string;
}>) {
  return (
    <XStack alignItems="center" gap={16} paddingHorizontal={16} paddingVertical={12}>
      <IconDisc icon={icon} />
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
