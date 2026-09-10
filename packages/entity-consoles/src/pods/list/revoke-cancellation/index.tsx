import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Tooltip } from '@mui/material';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { formatDateTime } from '@duncit/datetime';
import { useTranslation, type Translate } from '@duncit/shell';
import RevokeCancellationDialog from './RevokeCancellationDialog';
import { POD_REVOKE_PREVIEW, REVOKE_POD_CANCELLATION, type PodRevokePreview } from './queries';

interface Props {
  podId: string;
  podTitle: string;
}

/** Why the button is greyed, in words, or '' when it is not. An empty title is
 * how MUI is told to render no tooltip at all, so this is one code path. */
function blockedHint(preview: PodRevokePreview | null | undefined, t: Translate): string {
  if (!preview || preview.can_revoke) return '';
  if (preview.blocked_reason === 'POD_DATE_PASSED') {
    const when = preview.pod_date_time ? formatDateTime(preview.pod_date_time) : '';
    return t('admin.pods.revokeBlockedPast', { vars: { when } });
  }
  return t('admin.pods.revokeBlockedNotCancelled');
}

/**
 * Puts a cancelled pod back on the platform.
 *
 * Admin only — it is the one console the mutation accepts. Two things gate it,
 * and both are the SERVER's answer rather than this component's arithmetic: a
 * cancellation may only be revoked before the pod's own start, and the panel
 * behind the button prices what revoking would cost. A greyed button says why
 * on hover instead of leaving the reader to guess.
 */
export default function RevokeCancellationAction({ podId, podTitle }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const previewQuery = useQuery<{ podRevokePreview: PodRevokePreview }>(POD_REVOKE_PREVIEW, {
    variables: { id: podId },
    fetchPolicy: 'cache-and-network',
  });
  // The header chips and the timeline read the pod and its audit trail through
  // their OWN queries, and the revoke adds a RESTORE entry to the second one —
  // so the page is refreshed by name rather than by what the mutation returns.
  const [revoke, revokeState] = useMutation(REVOKE_POD_CANCELLATION, {
    refetchQueries: ['AdminPodDetail', 'AdminPodAuditTrail', 'AdminPodRevokePreview'],
    awaitRefetchQueries: true,
  });

  const preview = previewQuery.data?.podRevokePreview ?? null;
  const hint = blockedHint(preview, t);

  const onConfirm = async () => {
    try {
      await revoke({ variables: { id: podId } });
      setOpen(false);
      notifySuccess(t('admin.pods.revokeCancellationDone'));
    } catch (e) {
      notifyError((e as Error).message);
    }
  };

  return (
    <>
      {/* The span is what carries the hover: a disabled MUI button fires no
          pointer events, so a tooltip attached straight to it never opens —
          which is exactly the case the reader needs the explanation in. */}
      <Tooltip title={hint}>
        <span>
          <DuncitButton
            variant="outlined"
            color="warning"
            startIcon={<RestoreFromTrashIcon />}
            disabled={!preview?.can_revoke}
            onClick={() => setOpen(true)}
          >
            {t('admin.pods.revokeCancellation')}
          </DuncitButton>
        </span>
      </Tooltip>
      <RevokeCancellationDialog
        open={open}
        podTitle={podTitle}
        preview={preview}
        saving={revokeState.loading}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
      />
    </>
  );
}
