import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  deductionPct: number;
}

/** "Finding your replacement" note next to the Rejoin option — tap the info icon
 * to reveal the % refund deduction once someone fills the spot (dynamic from
 * Finance → Default Deductions → Backouts). RN twin of mWeb's ReplacementNotice. */
export function ReplacementNotice({ deductionPct }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const { color, success } = useThemeColors();
  const { t } = useTranslation();
  const pct = Math.max(0, Math.min(100, Number(deductionPct) || 0));

  return (
    <YStack gap={4} testID="ph-replacement">
      <XStack alignItems="center" gap={6}>
        <Text fontSize={13} fontWeight="600" color="$color">
          {t('mweb.podHistory.findingReplacement')}
        </Text>
        <XStack
          pressStyle={PRESS_STYLE.surface}
          testID="ph-replacement-info"
          role="button"
          aria-label={t('mweb.podHistory.refundDetails')}
          aria-expanded={open}
          onPress={() => setOpen((prev) => !prev)}
          padding={2}
        >
          <MaterialIcons name="info-outline" size={16} color={color} />
        </XStack>
      </XStack>
      {open ? (
        <Text testID="ph-replacement-detail" fontSize={12} fontWeight="700" color={success}>
          {t('mweb.podHistory.replacementRefundNote', { vars: { pct } })}
        </Text>
      ) : null}
    </YStack>
  );
}
