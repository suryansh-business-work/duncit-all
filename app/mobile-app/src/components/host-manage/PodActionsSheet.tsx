import { YStack } from 'tamagui';

import { ActionRow } from '@/components/host-manage/ActionRow';
import { FeedbackLinkRow } from '@/components/host-manage/FeedbackLinkRow';
import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  open: boolean;
  podTitle: string;
  /**
   * The venue refused this pod's slot, so it never ran and never sold a seat.
   * Scanning tickets, marking attendance, completing it and asking guests to
   * rate it are all meaningless then — the host resubmits or cancels instead.
   */
  venueRejected: boolean;
  onClose: () => void;
  onScan: () => void;
  onSeeAttendance: () => void;
  /** Opens the pod's "Slot Request Sent" screen — the venue decision, re-checkable. */
  onSlotRequest: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onOpenFeedback: () => void;
  onShareFeedback: () => void;
  onCopyFeedback: () => void;
  onCancel: () => void;
  onClubAdmin: () => void;
}

/** Every per-pod action in one sheet, opened from the row's overflow button —
 * the Tamagui twin of mWeb's HostPodActionsMenu (rule 27). */
export function PodActionsSheet({
  open,
  podTitle,
  venueRejected,
  onClose,
  onScan,
  onSeeAttendance,
  onSlotRequest,
  onComplete,
  onEdit,
  onOpenFeedback,
  onShareFeedback,
  onCopyFeedback,
  onCancel,
  onClubAdmin,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink, danger, primary, success, warning } = useThemeColors();

  // The actions that only make sense for a pod that actually gets to run.
  const showAttendeeActions = !venueRejected;

  return (
    // Eight rows are ~430px before any chrome — enough to be clipped in
    // landscape on any phone, which is why this is capped and scrollable now.
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="pod-actions-sheet"
      title={podTitle}
      subtitle={t('mweb.hostManage.podActions')}
      closeLabel="Close"
    >
      <YStack gap={10}>
        {showAttendeeActions ? (
          <ActionRow
            testID="pod-action-scan"
            icon="qr-code-scanner"
            label={t('mweb.hostManage.scanAttendeeEventTickets')}
            tint={primary}
            onPress={onScan}
          />
        ) : null}
        {showAttendeeActions ? (
          <ActionRow
            testID="pod-action-attendance"
            icon="fact-check"
            label={t('mweb.attendance.menuItem')}
            tint={success}
            onPress={onSeeAttendance}
          />
        ) : null}
        <ActionRow
          testID="pod-action-slot-request"
          icon="pending-actions"
          label={t('mweb.podPending.menuItem')}
          tint={warning}
          onPress={onSlotRequest}
        />
        {showAttendeeActions ? (
          <ActionRow
            testID="pod-action-complete"
            icon="task-alt"
            label={t('mweb.hostManage.completePod')}
            tint={success}
            onPress={onComplete}
          />
        ) : null}
        <ActionRow
          testID="pod-action-edit"
          icon="edit"
          label={t('mweb.hostManage.editPod')}
          tint={ink}
          onPress={onEdit}
        />
        {/* The rating link: tapping the row opens the form, and the two
                    icons beside it hand the link to the people who came. */}
        {showAttendeeActions ? (
          <FeedbackLinkRow
            onOpen={onOpenFeedback}
            onShare={onShareFeedback}
            onCopy={onCopyFeedback}
          />
        ) : null}
        <ActionRow
          testID="pod-action-club-admin"
          icon="support-agent"
          label={t('mweb.podClubAdmin.menuItem')}
          tint={primary}
          onPress={onClubAdmin}
        />
        <ActionRow
          testID="pod-action-cancel"
          icon="cancel"
          label={t('mweb.hostManage.cancelPod')}
          tint={danger}
          danger
          onPress={onCancel}
        />
      </YStack>
    </DuncitDialog>
  );
}
