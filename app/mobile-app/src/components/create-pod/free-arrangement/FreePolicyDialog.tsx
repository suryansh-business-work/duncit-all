import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { FREE_POLICY_KEYS } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  open: boolean;
  onClose: () => void;
  testID: string;
}

/**
 * "More details" on the free policy: how free pods and free venues work, point
 * by point — the reasons Duncit allows, the venue's approval, no counters, the
 * audit and Duncit's right to revoke. mWeb twin: @duncit/forms FreePolicyDialog.
 */
export function FreePolicyDialog({ open, onClose, testID }: Readonly<Props>) {
  const { t } = useTranslation();
  const { info } = useThemeColors();
  const close = t(FREE_POLICY_KEYS.close);
  const title = t(FREE_POLICY_KEYS.detailsTitle);

  return (
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID={testID}
      title={title}
      closeLabel={close}
      variant="center"
      footer={
        <DuncitButton
          testID={`${testID}-close`}
          label={close}
          onPress={onClose}
          variant="outline"
          fullWidth
        />
      }
    >
      <YStack gap={12} role="list" aria-label={title}>
        {FREE_POLICY_KEYS.detailsPoints.map((key) => (
          <XStack key={key} gap={10} alignItems="flex-start" role="listitem">
            <MaterialIcons name="check-circle-outline" size={18} color={info} aria-hidden />
            <Text flex={1} fontSize={13} lineHeight={19} color="$color">
              {t(key)}
            </Text>
          </XStack>
        ))}
      </YStack>
    </DuncitDialog>
  );
}
