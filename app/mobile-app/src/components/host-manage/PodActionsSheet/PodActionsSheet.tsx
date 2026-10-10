import { POD_SCAN_LEAD_MINUTES } from '@duncit/utils';

import { ActionRow } from '@/components/host-manage/ActionRow';
import { GatedActionRow } from '@/components/host-manage/GatedActionRow';
import { RowGroup } from '@/components/host-manage/RowGroup';
import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

import { PodLinkRows } from './PodLinkRows';
import type { PodActionsSheetProps } from './types';

/** Every per-pod action in one sheet, opened from the row's overflow button —
 * the Tamagui twin of mWeb's HostPodActionsMenu (rule 27). */
export function PodActionsSheet({
  open,
  podTitle,
  venueRejected,
  canComplete,
  scanWindow,
  canAmend,
  onClose,
  onScan,
  onSeeAttendance,
  onChallenges,
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
  onRequestChange,
}: Readonly<PodActionsSheetProps>) {
  const { t } = useTranslation();
  const { color: ink, danger, primary, success, warning } = useThemeColors();

  // The actions that only make sense for a pod that actually gets to run.
  const showAttendeeActions = !venueRejected;
  // Read once and passed to all three rows: the same sentence under each, and
  // one lookup rather than three (rule 26g — compute in the parent).
  const amendClosed = t('mweb.hostPodActions.amendClosed');
  // Only shown while the row is inert, so "not yet" or else "too late".
  const scanReason =
    scanWindow === 'NOT_OPEN'
      ? t('mweb.hostPodActions.scanNotOpen', { vars: { minutes: POD_SCAN_LEAD_MINUTES } })
      : t('mweb.hostPodActions.scanClosed');

  return (
    // Eight rows are ~430px before any chrome — enough to be clipped in
    // landscape on any phone, which is why this is capped and scrollable now.
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="pod-actions-sheet"
      title={podTitle}
      closeLabel="Close"
    >
      <RowGroup>
        {showAttendeeActions ? (
          <GatedActionRow
            testID="pod-action-scan"
            icon="qr-code-scanner"
            label={t('mweb.hostManage.scanAttendeeEventTickets')}
            tint={primary}
            enabled={scanWindow === 'OPEN'}
            reason={scanReason}
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
          testID="pod-action-challenges"
          icon="emoji-events"
          label={t('mweb.challenge.menuItem')}
          tint={primary}
          onPress={onChallenges}
        />
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
        {/* Edit, Request Change Host and Cancel all rewrite a pod's plan, so a
            pod that has already run closes all three — with the reason on each,
            because they are not adjacent and a host reaching for any one of
            them deserves the same answer. */}
        <GatedActionRow
          testID="pod-action-edit"
          icon="edit"
          label={t('mweb.hostManage.editPod')}
          tint={ink}
          enabled={canAmend}
          reason={amendClosed}
          onPress={onEdit}
        />
        {showAttendeeActions ? (
          <PodLinkRows
            primary={primary}
            onOpenPodMedia={onOpenPodMedia}
            onSharePodMedia={onSharePodMedia}
            onCopyPodMedia={onCopyPodMedia}
            onOpenFeedback={onOpenFeedback}
            onShareFeedback={onShareFeedback}
            onCopyFeedback={onCopyFeedback}
          />
        ) : null}
        <ActionRow
          testID="pod-action-club-admin"
          icon="support-agent"
          label={t('mweb.podClubAdmin.menuItem')}
          tint={primary}
          onPress={onClubAdmin}
        />
        {/* Above Cancel on purpose: asking for a different host keeps the pod
            and everyone's seat, and it is what a host should reach for first. */}
        {onRequestChange ? (
          <GatedActionRow
            testID="pod-action-request-change"
            icon="swap-horiz"
            label={t('changeRequest.menuHost')}
            tint={warning}
            enabled={canAmend}
            reason={amendClosed}
            onPress={onRequestChange}
          />
        ) : null}
        <GatedActionRow
          testID="pod-action-cancel"
          icon="cancel"
          label={t('mweb.hostManage.cancelPod')}
          tint={danger}
          danger
          enabled={canAmend}
          reason={amendClosed}
          onPress={onCancel}
        />
      </RowGroup>
    </DuncitDialog>
  );
}
