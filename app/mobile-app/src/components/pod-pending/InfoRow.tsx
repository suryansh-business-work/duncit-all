import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

export interface InfoRowProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  /** Lands on the value node so assertions read the value alone — the row also
   * holds the label and an icon glyph, which would pollute its text content. */
  testID?: string;
}

/** "icon · label / value" line used by every card on the waiting screen. */
export function InfoRow({ icon, label, value, testID }: Readonly<InfoRowProps>) {
  const { muted } = useThemeColors();
  return (
    <XStack gap={8} alignItems="flex-start">
      <MaterialIcons name={icon} size={16} color={muted} style={{ marginTop: 2 }} />
      <YStack flex={1}>
        <Text fontSize={11} fontWeight="600" color="$muted">
          {label}
        </Text>
        <Text testID={testID} fontSize={13} fontWeight="700" color="$color">
          {value}
        </Text>
      </YStack>
    </XStack>
  );
}
