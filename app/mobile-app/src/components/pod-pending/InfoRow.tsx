import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

export interface InfoRowProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  testID?: string;
}

/** "icon · label / value" line used by every card on the waiting screen. */
export function InfoRow({ icon, label, value, testID }: Readonly<InfoRowProps>) {
  const { muted } = useThemeColors();
  return (
    <XStack testID={testID} gap={8} alignItems="flex-start">
      <MaterialIcons name={icon} size={16} color={muted} style={{ marginTop: 2 }} />
      <YStack flex={1}>
        <Text fontSize={11} fontWeight="800" color="$muted">
          {label}
        </Text>
        <Text fontSize={13} fontWeight="700" color="$color">
          {value}
        </Text>
      </YStack>
    </XStack>
  );
}
