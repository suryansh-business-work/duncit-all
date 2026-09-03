import { YStack } from 'tamagui';
import { canOpenPodAttendance, podRowStatus, podRowStatusLabel } from '@duncit/utils';

import { DuncitDialog } from '@/components/DuncitDialog';
import { ActionRow } from '@/components/host-manage/ActionRow';
import type { ClubAdminPodRow } from '@/hooks/useClubAdminPods';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  pod: ClubAdminPodRow | null;
  onClose: () => void;
  onDetails: () => void;
  onAttendance: () => void;
  onEdit: () => void;
  onActivity: () => void;
  onDelete: () => void;
}

/**
 * Every per-pod action of the Club Admin in one sheet — the Tamagui twin of
 * the row menu the MUI pods table opens (rule 27). Attendance is offered only
 * for a pod that is running or has run: a draft, an unapproved and a
 * cancelled pod have no door to have stood at (`canOpenPodAttendance`).
 */
export function ClubPodActionsSheet({
  pod,
  onClose,
  onDetails,
  onAttendance,
  onEdit,
  onActivity,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink, danger, primary, success, warning } = useThemeColors();
  const status = pod ? podRowStatusLabel(podRowStatus(pod), t) : undefined;

  return (
    <DuncitDialog
      open={!!pod}
      onClose={onClose}
      testID="club-pod-actions"
      title={pod?.pod_title ?? ''}
      subtitle={status}
      closeLabel={t('mweb.common.close')}
    >
      <YStack gap={10}>
        <ActionRow
          testID="club-pod-action-details"
          icon="info-outline"
          label={t('clubAdmin.pods.podDetails')}
          tint={primary}
          onPress={onDetails}
        />
        {pod && canOpenPodAttendance(pod) ? (
          <ActionRow
            testID="club-pod-action-attendance"
            icon="fact-check"
            label={t('clubAdmin.pods.podAttendance')}
            tint={success}
            onPress={onAttendance}
          />
        ) : null}
        <ActionRow
          testID="club-pod-action-edit"
          icon="edit"
          label={t('clubAdmin.pods.editPod')}
          tint={ink}
          onPress={onEdit}
        />
        <ActionRow
          testID="club-pod-action-activity"
          icon="security"
          label={t('clubAdmin.pods.aiMonitoring')}
          tint={warning}
          onPress={onActivity}
        />
        <ActionRow
          testID="club-pod-action-delete"
          icon="delete-outline"
          label={t('clubAdmin.pods.deletePod')}
          tint={danger}
          danger
          onPress={onDelete}
        />
      </YStack>
    </DuncitDialog>
  );
}
