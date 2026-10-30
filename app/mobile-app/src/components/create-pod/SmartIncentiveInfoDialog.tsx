import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { SmartIncentiveInfoLabels } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

export type SmartIncentiveInfoDialogProps = Readonly<{
  open: boolean;
  onClose: () => void;
  labels: SmartIncentiveInfoLabels;
  /** Loyalty's delay before the offer shows, quoted in the first point. */
  delaySeconds: number;
}>;

/**
 * What Smart Incentive does and who pays for it, in four plain points. Opened
 * when a host switches the incentive on and again from "How it works", so the
 * host has read that the discount comes out of their own share before they
 * publish. Native twin of @duncit/ui SmartIncentiveInfoDialog (same test ids).
 */
export function SmartIncentiveInfoDialog({
  open,
  onClose,
  labels,
  delaySeconds,
}: SmartIncentiveInfoDialogProps) {
  const { t } = useTranslation();
  const { success } = useThemeColors();
  const points = [
    { id: 'what', text: labels.what(delaySeconds) },
    { id: 'who', text: labels.who },
    { id: 'cut', text: labels.cut },
    { id: 'change', text: labels.change },
  ];
  return (
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="smart-incentive-info"
      title={labels.title}
      closeLabel={t('mweb.common.close')}
      variant="center"
      // "Got it" is the way out (and owns the `-close` test id the MUI twin uses).
      showCloseButton={false}
      footer={
        <DuncitButton
          testID="smart-incentive-info-close"
          label={labels.gotIt}
          onPress={onClose}
          fullWidth
        />
      }
    >
      <YStack gap={12} role="list" aria-label={labels.title}>
        {points.map((point) => (
          <XStack
            key={point.id}
            testID={`smart-incentive-info-${point.id}`}
            role="listitem"
            gap={10}
            alignItems="flex-start"
          >
            <MaterialIcons name="check-circle-outline" size={18} color={success} aria-hidden />
            <Text flex={1} fontSize={13} lineHeight={19} color="$color">
              {point.text}
            </Text>
          </XStack>
        ))}
      </YStack>
    </DuncitDialog>
  );
}
