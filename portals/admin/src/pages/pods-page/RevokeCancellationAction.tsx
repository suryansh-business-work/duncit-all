import { useMutation } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { REVOKE_POD_CANCELLATION } from './queries';

interface Props {
  podId: string;
  podTitle: string;
}

/**
 * Puts a cancelled pod back on the platform.
 *
 * Admin only — it is the one console the mutation accepts — and deliberately
 * loud about its limits: the pod, its venue slot and its reserved stock come
 * back, but the refunds already paid out do not, and the attendees who were
 * emailed "cancelled" are not told otherwise. The confirmation says both before
 * anything is written, because neither is something an admin can undo after.
 */
export default function RevokeCancellationAction({ podId, podTitle }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  // The header chips and the timeline read the pod and its audit trail through
  // their OWN queries, and the revoke adds a RESTORE entry to the second one —
  // so the page is refreshed by name rather than by what the mutation returns.
  const [revoke, { loading }] = useMutation(REVOKE_POD_CANCELLATION, {
    refetchQueries: ['AdminPodDetail', 'AdminPodAuditTrail'],
    awaitRefetchQueries: true,
  });

  const onRevoke = async () => {
    const ok = await confirm({
      title: t('admin.pods.revokeCancellationTitle'),
      message: (
        <Stack spacing={1}>
          <Typography variant="body2">
            {t('admin.pods.revokeCancellationBody', { vars: { title: podTitle } })}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }} color="warning.main">
            {t('admin.pods.revokeCancellationCaveat')}
          </Typography>
        </Stack>
      ),
      confirmLabel: t('admin.pods.revokeCancellationConfirm'),
    });
    if (!ok) return;
    try {
      await revoke({ variables: { id: podId } });
      notifySuccess(t('admin.pods.revokeCancellationDone'));
    } catch (e) {
      notifyError((e as Error).message);
    }
  };

  return (
    <DuncitButton
      variant="outlined"
      color="warning"
      startIcon={<RestoreFromTrashIcon />}
      loading={loading}
      onClick={onRevoke}
    >
      {t('admin.pods.revokeCancellation')}
    </DuncitButton>
  );
}
