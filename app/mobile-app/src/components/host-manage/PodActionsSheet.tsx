import { YStack } from 'tamagui';

import { ActionRow } from '@/components/host-manage/ActionRow';
import { FeedbackLinkRow } from '@/components/host-manage/FeedbackLinkRow';
import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  open: boolean;
  podTitle: string;
  onClose: () => void;
  onScan: () => void;
  onSeeAttendance: () => void;
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
  onClose,
  onScan,
  onSeeAttendance,
  onComplete,
  onEdit,
  onOpenFeedback,
  onShareFeedback,
  onCopyFeedback,
  onCancel,
  onClubAdmin,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink, danger, primary, success } = useThemeColors();

  return (
    // Eight rows are ~430px before any chrome — enough to be clipped in
    // landscape on any phone, which is why this is capped and scrollable now.
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="pod-actions-sheet"
      title={podTitle}
      subtitle="Pod actions"
      closeLabel="Close"
    >
      <YStack gap={10}>
        <ActionRow
          testID="pod-action-scan"
          icon="qr-code-scanner"
          label="Scan attendee event tickets"
          tint={primary}
          onPress={onScan}
        />
        <ActionRow
          testID="pod-action-attendance"
          icon="fact-check"
          label={t('mweb.attendance.menuItem')}
          tint={success}
          onPress={onSeeAttendance}
        />
        <ActionRow
          testID="pod-action-complete"
          icon="task-alt"
          label="Complete pod"
          tint={success}
          onPress={onComplete}
        />
        <ActionRow
          testID="pod-action-edit"
          icon="edit"
          label="Edit pod"
          tint={ink}
          onPress={onEdit}
        />
        {/* The rating link: tapping the row opens the form, and the two
                    icons beside it hand the link to the people who came. */}
        <FeedbackLinkRow
          onOpen={onOpenFeedback}
          onShare={onShareFeedback}
          onCopy={onCopyFeedback}
        />
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
          label="Cancel pod"
          tint={danger}
          danger
          onPress={onCancel}
        />
      </YStack>
    </DuncitDialog>
  );
}
