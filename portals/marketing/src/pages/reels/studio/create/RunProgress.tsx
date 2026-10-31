import { useMutation } from '@apollo/client/react';
import { Alert, CircularProgress, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { CANCEL_MARKETING_RUN } from '../../../activity-page/queries';
import RunStatusChip from '../../../activity-page/RunStatusChip';
import RunSteps from '../../../activity-page/RunSteps';
import { useRunWatch } from './useRunWatch';

interface Props {
  /** The run the last step reported; null before one has. */
  runId: string | null;
  /** True while the step's own request is out — before the run's id is known. */
  working: boolean;
  /** Abandons the step while its request is still out: the answer, when it comes, is ignored. */
  onAbandon: () => void;
}

/**
 * What a Create step is doing, live: a working line while the request is
 * out, then the run it made — status, every step, and the error when it did
 * not finish. Cancel is safe at any point: before the run is known it
 * abandons the step; after, it asks the server to stop the run.
 */
export default function RunProgress({ runId, working, onAbandon }: Readonly<Props>) {
  const { t } = useTranslation();
  const watch = useRunWatch(runId);
  const [cancelMutation, { loading: cancelling }] = useMutation(CANCEL_MARKETING_RUN);

  // Offered only while a run is on screen, so there is always an id to stop.
  const cancelRun = async () => {
    try {
      await cancelMutation({ variables: { id: runId } });
    } catch (error) {
      notifyError(parseApiError(error, t('ai.reels.create.cancelFailed')));
    }
  };

  if (!working && !watch.run) return null;

  return (
    <Stack spacing={1} sx={{ mt: 1.5 }} data-testid="reel-run-progress">
      {working && !watch.run && (
        <Stack direction="row" role="status" sx={{ alignItems: 'center', gap: 1, color: 'text.secondary' }} data-testid="reel-run-working">
          <CircularProgress size={16} aria-hidden />
          <Typography variant="body2" sx={{ flex: 1 }}>
            {t('ai.reels.create.working')}
          </Typography>
          <DuncitButton size="small" variant="text" onClick={onAbandon} data-testid="reel-run-abandon">
            {t('shell.common.cancel')}
          </DuncitButton>
        </Stack>
      )}
      {watch.run && (
        <>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }} role="status">
            <RunStatusChip status={watch.run.status} />
            <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }} noWrap>
              {watch.run.name}
            </Typography>
            {watch.active && (
              <DuncitButton size="small" variant="text" loading={cancelling} onClick={cancelRun} data-testid="reel-run-cancel">
                {t('ai.reels.create.cancelRun')}
              </DuncitButton>
            )}
          </Stack>
          <RunSteps steps={watch.run.steps} />
          {watch.failure && (
            <Alert severity="error" data-testid="reel-run-error">
              {t('ai.reels.create.runFailed', { vars: { reason: watch.failure } })}
            </Alert>
          )}
        </>
      )}
      {watch.error && (
        <Alert severity="warning" data-testid="reel-run-unreadable">
          {parseApiError(watch.error, t('ai.reels.create.runUnreadable'))}
        </Alert>
      )}
    </Stack>
  );
}
