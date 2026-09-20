import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Box, Chip, Divider, List, ListItemButton, ListItemText, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitIconButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { AUTOMATION_RUNS, CANCEL_RUN } from '../queries';
import { RUN_MODE_KEYS, RUN_STATUS_KEYS } from '../node-kinds';
import type { AutomationRun, RunStatus } from '../types';
import RunDialog from './RunDialog';

interface Props {
  flowId: string;
  onClose: () => void;
}

const STATUS_COLOR: Record<RunStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  RUNNING: 'info',
  WAITING_REPLY: 'info',
  WAITING_DELAY: 'default',
  COMPLETED: 'success',
  FAILED: 'error',
  CANCELLED: 'warning',
};

const EMPTY: AutomationRun[] = [];

/** Every walk of this flow, live and test, newest first — and each one in full on click. */
export default function RunsPanel({ flowId, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, loading, error } = useQuery<{ automationRuns: AutomationRun[] }>(AUTOMATION_RUNS, {
    variables: { flow_id: flowId, limit: 100 },
    fetchPolicy: 'cache-and-network',
    pollInterval: 15_000,
  });
  const [cancel, { loading: cancelling }] = useMutation<{ cancelAutomationRun: AutomationRun }>(CANCEL_RUN, {
    refetchQueries: [{ query: AUTOMATION_RUNS, variables: { flow_id: flowId, limit: 100 } }],
  });
  const runs = data?.automationRuns ?? EMPTY;
  const open = runs.find((run) => run.id === openId) ?? null;

  const cancelRun = async (run: AutomationRun) => {
    try {
      await cancel({ variables: { id: run.id } });
      notifySuccess(t('ai.automation.runs.cancelled'));
    } catch (err) {
      notifyError(parseApiError(err, t('ai.automation.runs.cancelFailed')));
    }
  };

  return (
    <Stack sx={{ height: '100%' }} data-testid="automation-runs-panel">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', p: 1.5, pb: 1 }}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, flex: 1 }}>
          {t('ai.automation.runs.title')}
        </Typography>
        <Tooltip title={t('shell.common.close')}>
          <span>
            <DuncitIconButton size="small" aria-label={t('shell.common.close')} onClick={onClose}>
              <CloseIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
      </Stack>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <QueryGuard loading={loading && !data} error={error}>
          {runs.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', p: 2 }}>
              {t('ai.automation.runs.empty')}
            </Typography>
          ) : (
            <List dense disablePadding>
              {runs.map((run) => (
                <ListItemButton
                  key={run.id}
                  onClick={() => setOpenId(run.id)}
                  aria-label={t('ai.automation.runs.openRun', { vars: { id: run.contact.name } })}
                  sx={{ alignItems: 'flex-start', py: 1 }}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }} noWrap>
                          {run.contact.name}
                        </Typography>
                        <Chip size="small" variant="outlined" label={t(RUN_MODE_KEYS[run.mode])} sx={{ height: 20 }} />
                        <Chip size="small" color={STATUS_COLOR[run.status]} label={t(RUN_STATUS_KEYS[run.status])} sx={{ height: 20 }} />
                      </Stack>
                    }
                    secondary={`${run.contact.phone || run.contact.email} · ${formatDateTime(run.started_at)} · ${t('ai.automation.runs.steps')} ${run.steps.length}`}
                    slotProps={{ secondary: { noWrap: true } }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </QueryGuard>
      </Box>
      <RunDialog run={open} cancelling={cancelling} onCancel={cancelRun} onClose={() => setOpenId(null)} />
    </Stack>
  );
}
