import { useCallback, useId } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Divider, Drawer, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { MARKETING_RUN, type MarketingRunDetail } from './queries';
import RunStatusChip from './RunStatusChip';
import RunSummary from './RunSummary';
import RunApproval from './RunApproval';
import RunActions from './RunActions';
import RunSteps from './RunSteps';
import RunApiLog from './RunApiLog';

interface Props {
  /** The run to show; null when closed. */
  runId: string | null;
  onClose: () => void;
  /** An action changed the run — the grid behind the drawer should read it again too. */
  onChanged: () => void;
}

/** One run, opened: what it was, what it did step by step, what it called, and what can be done to it. */
export default function RunDrawer({ runId, onClose, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const { data, loading, error, refetch } = useQuery<{ marketingRun: MarketingRunDetail }>(MARKETING_RUN, {
    variables: { id: runId ?? '' },
    skip: !runId,
    fetchPolicy: 'cache-and-network',
  });
  const run = data?.marketingRun;

  const changed = useCallback(() => {
    refetch().catch((err: unknown) => notify(parseApiError(err), 'error'));
    onChanged();
  }, [refetch, onChanged]);

  return (
    <Drawer
      anchor="right"
      open={!!runId}
      onClose={onClose}
      slotProps={{ paper: { 'aria-labelledby': titleId, sx: { width: { xs: '100%', md: 640 } } } }}
    >
      <Stack spacing={2} sx={{ p: 2 }} data-testid="marketing-run-drawer">
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography id={titleId} variant="h6" component="h2" sx={{ wordBreak: 'break-word' }}>
              {run ? run.name : t('marketing.runs.detailsTitle')}
            </Typography>
            {run && (
              <Box sx={{ mt: 0.5 }}>
                <RunStatusChip status={run.status} />
              </Box>
            )}
          </Box>
          <Tooltip title={t('shell.common.close')}>
            <DuncitIconButton onClick={onClose}>
              <CloseIcon />
            </DuncitIconButton>
          </Tooltip>
        </Stack>

        {loading && !run && <LinearProgress />}
        {error && <Alert severity="error">{parseApiError(error)}</Alert>}

        {run && (
          <>
            <RunSummary run={run} />
            <RunApproval approval={run.approval} />
            <RunActions run={run} onChanged={changed} />
            <Divider />
            <RunSteps steps={run.steps} />
            <RunApiLog entries={run.api_log} />
          </>
        )}
      </Stack>
    </Drawer>
  );
}
