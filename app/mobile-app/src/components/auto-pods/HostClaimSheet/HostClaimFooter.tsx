import { XStack, YStack } from 'tamagui';
import type { AutoPodLabels } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';

interface HostClaimFooterProps {
  labels: AutoPodLabels;
  disabled: boolean;
  onClose: () => void;
  onAssign: () => void;
}

/** Dismiss / "Assign Myself" — the sheet's footer row. */
export function HostClaimFooter({
  labels,
  disabled,
  onClose,
  onAssign,
}: Readonly<HostClaimFooterProps>) {
  return (
    <XStack gap={10}>
      <YStack flex={1}>
        <DuncitButton
          testID="auto-pod-assign-cancel"
          label={labels.dismiss}
          onPress={onClose}
          variant="soft"
          tone="neutral"
        />
      </YStack>
      <YStack flex={1}>
        <DuncitButton
          testID="auto-pod-assign-confirm"
          label={labels.assignMyselfCta}
          onPress={onAssign}
          disabled={disabled}
        />
      </YStack>
    </XStack>
  );
}
