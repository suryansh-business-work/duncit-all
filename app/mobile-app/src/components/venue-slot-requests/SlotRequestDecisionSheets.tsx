import { XStack, YStack } from 'tamagui';
import { slotSpanLabel } from '@duncit/slots';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { LabeledInput } from '@/components/LabeledInput';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import type { SlotRequestRow } from '@/hooks/useVenueSlotRequests';

interface Props {
  /** The request being approved, or null while no approval is pending. */
  approving: SlotRequestRow | null;
  declining: boolean;
  reason: string;
  onReason: (text: string) => void;
  onApprove: () => void;
  onDecline: () => void;
  onDismiss: () => void;
}

/**
 * The two confirmations behind a slot request: approving asks once, declining
 * takes an optional reason. The app's own sheets rather than the platform
 * alert (rule 12), and the same two steps — in the same words — mWeb's card
 * opens (rule 27).
 */
export function SlotRequestDecisionSheets({
  approving,
  declining,
  reason,
  onReason,
  onApprove,
  onDecline,
  onDismiss,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();

  // Names the pod, the venue and the slot window, so the owner reads exactly
  // what goes live before it does.
  let approveMessage = '';
  if (approving) {
    const slot = slotSpanLabel(
      approving.start_at,
      approving.end_at,
      approving.whole_day,
      fmt,
      t('availability.wholeDay'),
    );
    approveMessage = t('mweb.venueSlotRequests.approveMessage', {
      vars: { pod: approving.pod_title, venue: approving.venue_name, slot },
    });
  }

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
          label={t('mweb.venueSlotRequests.decline')}
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
        open={!!approving}
        testID="slot-request-approve"
        title={t('mweb.venueSlotRequests.approveThisBooking')}
        message={approveMessage}
        confirmLabel={t('mweb.venueSlotRequests.approve')}
        onConfirm={onApprove}
        onCancel={onDismiss}
      />
      <DuncitDialog
        open={declining}
        onClose={onDismiss}
        testID="slot-request-decline"
        title={t('mweb.venueSlotRequests.declineThisBooking')}
        subtitle={t('mweb.venueSlotRequests.declineMessage')}
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
