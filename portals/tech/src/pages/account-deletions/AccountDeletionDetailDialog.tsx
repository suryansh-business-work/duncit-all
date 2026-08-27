import { useState } from 'react';
import { Alert, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, LinearProgress, Stack, Typography } from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog } from '@duncit/dialogs';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import PurgeAllDialog from './PurgeAllDialog';
import RejectDialog from './RejectDialog';
import TraceList from './TraceList';
import { useDeletionDetail } from './useDeletionDetail';
import { STATUS_COLOR } from './status';
import type { AccountDeletionRow, TraceGroup } from './queries';

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
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{
                  alignItems: "center",
                  flexWrap: "wrap"
                }}>
                <Chip
                  size="small"
                  color={STATUS_COLOR[request.status] ?? 'default'}
                  label={request.status}
                />
                <Chip size="small" variant="outlined" label={request.surface} />
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  {formatDateTime(request.requested_at)}
                </Typography>
                {request.days_remaining !== null && (
                  <Chip
                    size="small"
                    color={request.days_remaining > 3 ? 'default' : 'warning'}
                    label={t('tech.accountDeletions.dueOn', {
                      vars: {
                        date: formatDateTime(request.scheduled_delete_at),
                        count: request.days_remaining,
                      },
                    })}
                  />
                )}
              </Stack>

              <Stack spacing={0.25}>
                <Typography variant="subtitle1" sx={{
                  fontWeight: 700
                }}>
                  {request.name || request.email}
                </Typography>
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  {[request.email, request.phone].filter(Boolean).join(' · ')}
                </Typography>
                <Typography
                  variant="body2"
                  color={request.reason ? 'text.primary' : 'text.disabled'}
                  sx={{ mt: 0.5 }}
                >
                  {request.reason || t('tech.accountDeletions.noReason')}
                </Typography>
              </Stack>

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

              {request.purge_log.length > 0 && (
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2" sx={{
                    fontWeight: 700
                  }}>
                    {t('tech.accountDeletions.purgeLogTitle')}
                  </Typography>
                  {request.purge_log.map((entry) => (
                    <Typography
                      key={`${entry.model_name}.${entry.field_path}.${entry.purged_at}`}
                      variant="caption"
                      sx={{
                        color: "text.secondary"
                      }}
                    >
                      {t('tech.accountDeletions.purgeLogEntry', {
                        vars: {
                          removed: entry.removed,
                          collection: entry.collection_name,
                          field: entry.field_path,
                        },
                      })}
                    </Typography>
                  ))}
                </Stack>
              )}
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
