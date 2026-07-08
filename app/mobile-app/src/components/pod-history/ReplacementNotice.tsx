import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  deductionPct: number;
}

/** "Finding your replacement" note next to the Rejoin option — tap the info icon
 * to reveal the % refund deduction once someone fills the spot (dynamic from
 * Finance → Default Deductions → Backouts). RN twin of mWeb's ReplacementNotice. */
export function ReplacementNotice({ deductionPct }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const { color, success } = useThemeColors();
  const pct = Math.max(0, Math.min(100, Number(deductionPct) || 0));

  return (
    <YStack gap={4} testID="ph-replacement">
      <XStack alignItems="center" gap={6}>
        <Text fontSize={13} fontWeight="800" color="$color">
          We are finding your replacement
        </Text>
        <XStack
          testID="ph-replacement-info"
          role="button"
          aria-label="Refund details"
          aria-expanded={open}
          onPress={() => setOpen((prev) => !prev)}
          padding={2}
        >
          <MaterialIcons name="info-outline" size={16} color={color} />
        </XStack>
      </XStack>
      {open ? (
        <Text testID="ph-replacement-detail" fontSize={12} fontWeight="700" color={success}>
          We are finding your replacement. If someone fills your spot, the refund will be initiated
          with {pct}% deduction.
        </Text>
      ) : null}
    </YStack>
  );
}
