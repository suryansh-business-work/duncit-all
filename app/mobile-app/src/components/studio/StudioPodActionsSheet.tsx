import { Text, YStack } from 'tamagui';
import { changeRequestBlockedKey } from '@duncit/utils';

import { ActionRow } from '@/components/host-manage/ActionRow';
import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { StudioPod } from './studio-pods';

interface Props {
  pod: StudioPod | null;
  onClose: () => void;
  /** Venue Studio only — the owner's own cancel. */
  onCancel?: () => void;
  /** Why Cancel is closed, already worded. Undefined means it is open. */
  cancelDisabledText?: string;
  /** "Request Change Venue" / "…Club Admin" — the studio decides which. */
  onRequestChange?: () => void;
  /** Already translated: the label lives in the shared `changeRequest.*`. */
  requestChangeLabel?: string;
}

/**
 * The overflow sheet on a studio pod row — the Tamagui twin of mWeb's
 * `StudioPodRowMenu` (rule 27).
 *
 * It exists because the row used to carry a bare Cancel button that simply
 * VANISHED when the pod could no longer be cancelled, so a venue owner never
 * learned why — mWeb has always shown the item disabled with the reason
 * underneath. Now both do.
 */
export function StudioPodActionsSheet({
  pod,
  onClose,
  onCancel,
  cancelDisabledText,
  onRequestChange,
  requestChangeLabel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { danger, warning } = useThemeColors();
  // The same shared rule the MUI menu applies (rule 27): a finished or cancelled
  // pod has nothing left to hand over, and the row says so rather than hiding.
  const changeBlockedKey = pod ? changeRequestBlockedKey(pod, null) : null;
  const changeBlocked = changeBlockedKey ? t(changeBlockedKey) : undefined;

  return (
    <DuncitDialog
      open={!!pod}
      onClose={onClose}
      testID="studio-pod-actions"
      title={pod?.pod_title ?? ''}
      closeLabel={t('mweb.common.close')}
      variant="sheet"
    >
      <YStack gap={10}>
        {onRequestChange && requestChangeLabel ? (
          <YStack gap={4}>
            <ActionRow
              testID="studio-pod-action-request-change"
              icon="swap-horiz"
              label={requestChangeLabel}
              tint={warning}
              disabled={changeBlocked !== undefined}
              onPress={onRequestChange}
            />
            {changeBlocked ? (
              <Text testID="studio-pod-action-request-change-why" fontSize={11.5} color="$muted">
                {changeBlocked}
              </Text>
            ) : null}
          </YStack>
        ) : null}
        {onCancel ? (
          <YStack gap={4}>
            <ActionRow
              testID="studio-pod-action-cancel"
              icon="cancel"
              label={t('mweb.venuePods.cancelPod')}
              tint={danger}
              danger
              disabled={cancelDisabledText !== undefined}
              onPress={onCancel}
            />
            {cancelDisabledText ? (
              <Text testID="studio-pod-action-cancel-why" fontSize={11.5} color="$muted">
                {cancelDisabledText}
              </Text>
            ) : null}
          </YStack>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
