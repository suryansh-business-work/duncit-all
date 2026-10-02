import { useState } from 'react';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import PurgeAllDialog from '../PurgeAllDialog';
import RejectDialog from '../RejectDialog';
import TraceList from '../TraceList';
import { useDeletionDetail } from '../useDeletionDetail';
import type { AccountDeletionRow, TraceGroup } from '../queries';
import RequestSummary from './RequestSummary';
import PurgeLog from './PurgeLog';

interface Props {
  row: AccountDeletionRow | null;
  onClose: () => void;
  onChanged: () => void;
}

/**
 * One request, and everything that can be done about it.
 *
 * The trace is counted when this opens rather than stored on the request,
 * because the answer changes while the dialog is shut — the member keeps using
 * the account until somebody acts.
 */
export default function AccountDeletionDetailDialog({
  row,
  onClose,
  onChanged,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [pendingGroup, setPendingGroup] = useState<TraceGroup | null>(null);
  const [purgeAllOpen, setPurgeAllOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const state = useDeletionDetail(row?.id ?? null, onChanged);
  const { detail, loading, busyKey, purgingAll, steps } = state;

  const request = detail?.request;
  const open = !!row;
  const actionable = request?.status === 'PENDING';

  const confirmGroup = async () => {
    if (!pendingGroup) return;
    const group = pendingGroup;
    setPendingGroup(null);
    await state.deleteGroup(group);
  };

  /**
   * Start the run and leave the dialog on it.
   *
   * Deliberately does NOT close on success: the run's whole point is that the
   * operator sees each reference clear one at a time, and closing the moment
   * the last one lands throws away the only account of what just happened —
   * including which step failed when one does.
   */
  const confirmAll = async () => {
    await state.deleteEverything();
  };

  /** Closing the run closes the request with it — it is finished either way. */
  const closeRun = () => {
    setPurgeAllOpen(false);
    state.resetSteps();
    if (steps.length > 0) onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800 }}>
          {t('tech.accountDeletions.detailTitle', { vars: { code: row?.request_id ?? '' } })}
        </DialogTitle>
        <DialogContent dividers>
          {loading && !detail && <LinearProgress />}
          {request && (
            <Stack spacing={2}>
              <RequestSummary request={request} />

              <Divider />

              <Stack spacing={0.5}>
                <Typography variant="subtitle2" sx={{
                  fontWeight: 700
                }}>
                  {t('tech.accountDeletions.traceTitle')}
                </Typography>
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>
                  {t('tech.accountDeletions.traceIntro')}
                </Typography>
              </Stack>

              <Alert severity={detail?.account_exists ? 'info' : 'success'}>
                {detail?.account_exists
                  ? t('tech.accountDeletions.accountPresent')
                  : t('tech.accountDeletions.accountRemoved')}
              </Alert>

              <TraceList
                trace={detail?.trace ?? []}
                busyKey={busyKey}
                canDelete={!!actionable}
                onDelete={setPendingGroup}
              />

              {request.purge_log.length > 0 && <PurgeLog entries={request.purge_log} />}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={onClose}>{t('tech.accountDeletions.close')}</DuncitButton>
          {actionable && (
            <DuncitButton color="inherit" onClick={() => setRejectOpen(true)}>
              {t('tech.accountDeletions.reject')}
            </DuncitButton>
          )}
          {actionable && (
            <DuncitButton
              variant="contained"
              color="error"
              startIcon={<DeleteForeverIcon />}
              onClick={() => setPurgeAllOpen(true)}
              disabled={purgingAll || !!busyKey}
              data-testid="open-purge-all"
            >
              {t('tech.accountDeletions.deleteAll')}
            </DuncitButton>
          )}
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!pendingGroup}
        title={t('tech.accountDeletions.confirmGroupTitle', {
          vars: { collection: pendingGroup?.collection_name ?? '' },
        })}
        message={t('tech.accountDeletions.confirmGroupMessage', {
          vars: {
            count: pendingGroup?.count ?? 0,
            collection: pendingGroup?.collection_name ?? '',
          },
        })}
        confirmLabel={t('tech.accountDeletions.deleteGroup')}
        destructive
        onConfirm={() => {
          confirmGroup().catch(() => undefined);
        }}
        onClose={() => setPendingGroup(null)}
      />

      <PurgeAllDialog
        open={purgeAllOpen}
        code={request?.request_id ?? ''}
        name={request?.name ?? ''}
        busy={purgingAll}
        steps={steps}
        onConfirm={() => {
          confirmAll().catch(() => undefined);
        }}
        onClose={closeRun}
      />

      <RejectDialog
        open={rejectOpen}
        onConfirm={async (note) => {
          const ok = await state.rejectRequest(note);
          if (ok) {
            setRejectOpen(false);
            onClose();
          }
        }}
        onClose={() => setRejectOpen(false)}
      />
    </>
  );
}
