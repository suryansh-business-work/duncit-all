import { XStack, YStack } from 'tamagui';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { LabeledInput } from '@/components/LabeledInput';
import { useTranslation } from '@/hooks/useTranslation';

/** The words each decision is confirmed with — supplied by the screen. */
export interface DecisionCopy {
  approveLabel: string;
  approveMessage: string;
  declineLabel: string;
  declineMessage: string;
}

interface Props {
  approving: boolean;
  declining: boolean;
  reason: string;
  onReason: (text: string) => void;
  copy: DecisionCopy;
  onApprove: () => void;
  onDecline: () => void;
  onDismiss: () => void;
}

/**
 * The two confirmations behind a slot request: approving asks once, declining
 * takes an optional reason. The app's own sheets rather than the platform
 * alert (rule 12), and the same two steps mWeb's card opens (rule 27).
 */
export function SlotRequestDecisionSheets({
  approving,
  declining,
  reason,
  onReason,
  copy,
  onApprove,
  onDecline,
  onDismiss,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const declineFooter = (
    <XStack gap={10}>
      <YStack flex={1}>
        <DuncitButton
          testID="slot-request-decline-cancel"
          label={t('mweb.common.cancel')}
          onPress={onDismiss}
          variant="ghost"
          tone="neutral"
          fullWidth
        />
      </YStack>
      <YStack flex={1}>
        <DuncitButton
          testID="slot-request-decline-confirm"
          label={copy.declineLabel}
          onPress={onDecline}
          tone="danger"
          fullWidth
        />
      </YStack>
    </XStack>
  );

  return (
    <>
      <ConfirmDialog
        open={approving}
        testID="slot-request-approve"
        title={t('mweb.venueSlotRequests.approveThisBooking')}
        message={copy.approveMessage}
        confirmLabel={copy.approveLabel}
        onConfirm={onApprove}
        onCancel={onDismiss}
      />
      <DuncitDialog
        open={declining}
        onClose={onDismiss}
        testID="slot-request-decline"
        title={t('mweb.venueSlotRequests.declineThisBooking')}
        subtitle={copy.declineMessage}
        closeLabel={t('mweb.common.close')}
        variant="center"
        footer={declineFooter}
      >
        <LabeledInput
          testID="slot-request-decline-reason"
          label={t('mweb.common.reasonOptional')}
          value={reason}
          onChangeText={onReason}
          multiline
        />
      </DuncitDialog>
    </>
  );
}
