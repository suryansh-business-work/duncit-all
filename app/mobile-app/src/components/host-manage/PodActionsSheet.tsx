import { YStack } from 'tamagui';

import { ActionRow } from '@/components/host-manage/ActionRow';
import { PodLinkRow } from '@/components/host-manage/PodLinkRow';
import { STAR_COLOR } from '@/components/support/AspectRatingRow';
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
  /**
   * The pod has ended. Completion is the settlement — it prices the payout off
   * the seats scanned in — so it is offered on a PAST pod only: an upcoming or
   * ongoing pod would freeze the answer while the door is still open.
   */
  canComplete: boolean;
  onClose: () => void;
  onScan: () => void;
  onSeeAttendance: () => void;
  /** Opens the pod's "Slot Request Sent" screen — the venue decision, re-checkable. */
  onSlotRequest: () => void;
  onComplete: () => void;
  onEdit: () => void;
  /** The pod's media upload screen and the link to it — the same three actions. */
  onOpenPodMedia: () => void;
  onSharePodMedia: () => void;
  onCopyPodMedia: () => void;
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
  canComplete,
  onClose,
  onScan,
  onSeeAttendance,
  onSlotRequest,
  onComplete,
  onEdit,
  onOpenPodMedia,
  onSharePodMedia,
  onCopyPodMedia,
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
        {showAttendeeActions && canComplete ? (
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
        {/* The pod's two links, one row each: tapping it opens the page, and
            the two icons beside it hand THE SAME link to the people who came —
            Share and Copy resolve one address per pod, never two. */}
        {showAttendeeActions ? (
          <PodLinkRow
            testID="pod-action-media-link"
            icon="photo-camera-back"
            label={t('mweb.podMedia.uploadPodMedia')}
            tint={primary}
            shareLabel={t('mweb.podMedia.shareLink')}
            copyLabel={t('mweb.podMedia.copyLink')}
            shareTestID="pod-action-share-media"
            copyTestID="pod-action-copy-media"
            onOpen={onOpenPodMedia}
            onShare={onSharePodMedia}
            onCopy={onCopyPodMedia}
          />
        ) : null}
        {showAttendeeActions ? (
          <PodLinkRow
            testID="pod-action-feedback-link"
            icon="star-rate"
            label={t('mweb.podFeedback.feedbackLink')}
            tint={STAR_COLOR}
            shareLabel={t('mweb.podFeedback.shareLink')}
            copyLabel={t('mweb.podFeedback.copyLink')}
            shareTestID="pod-action-share-feedback"
            copyTestID="pod-action-copy-feedback"
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
