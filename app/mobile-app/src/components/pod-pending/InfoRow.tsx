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
    <XStack gap={12} alignItems="center" paddingVertical={12}>
      <MaterialIcons name={icon} size={20} color={muted} />
      <YStack flex={1} gap={2}>
        <Text fontSize={12} fontWeight="500" color="$muted">
          {label}
        </Text>
        <Text testID={testID} fontSize={14} fontWeight="600" color="$color">
          {value}
        </Text>
      </YStack>
    </XStack>
  );
}

/** A card's rows as one list, a hairline between each — mWeb twin:
 * `InfoRowList` in pages/pod-pending-page/InfoRow.tsx (rule 27). */
export function InfoRowList({ rows }: Readonly<{ rows: readonly InfoRowProps[] }>) {
  return (
    <YStack>
      {rows.map((row, index) => (
        <YStack key={row.label} borderTopWidth={index === 0 ? 0 : 1} borderTopColor="$borderColor">
          <InfoRow {...row} />
        </YStack>
      ))}
    </YStack>
  );
}
