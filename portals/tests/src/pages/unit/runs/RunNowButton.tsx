import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Box, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { fireAndForget } from '@duncit/logs';
import { START_UNIT_RUN, UNIT_TRIGGER_CONFIG, type StartUnitRunResult, type TriggerConfig } from '../queries';
import { testsLog } from '../../../lib/logger';

interface Props {
  /** Called once GitHub has accepted the run, so the table shows its QUEUED row. */
  onQueued: () => void;
}

const BLOCKED_KEY: Record<string, string> = {
  LOCAL: 'testsUnit.runNow.blockedLocal',
  GITHUB: 'testsUnit.runNow.blockedGithub',
  LIVE: 'testsUnit.runNow.blockedLive',
};

/**
 * Run now: the coverage workflow on this environment's branch, after a
 * confirmation. Disabled — never hidden — when this server cannot start one,
 * with the reason on hover.
 */
export default function RunNowButton({ onQueued }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const config = useQuery<{ unitTestTriggerConfig: TriggerConfig }>(UNIT_TRIGGER_CONFIG, { fetchPolicy: 'network-only' });
  const [startRun] = useMutation<{ startUnitTestRun: StartUnitRunResult }>(START_UNIT_RUN);
  const trigger = config.data?.unitTestTriggerConfig;

  const onClick = useCallback(async () => {
    if (!trigger) return;
    const ok = await confirm({
      title: t('testsUnit.runNow.confirmTitle'),
      message: t('testsUnit.runNow.confirmMessage', { vars: { branch: trigger.branch } }),
      confirmLabel: t('testsUnit.runNow.action'),
    });
    if (!ok) return;
    setBusy(true);
    try {
      const { data } = await startRun();
      const run = data?.startUnitTestRun.run;
      notifySuccess(t('testsUnit.runNow.queued', { vars: { run: run?.run_no ?? '' } }));
      onQueued();
    } catch (err) {
      testsLog.error('/unit/runs', 'RunNowButton', { error: err });
      notifyError(err instanceof Error ? err.message : t('testsUnit.runNow.failed'));
    } finally {
      setBusy(false);
      fireAndForget(config.refetch(), testsLog, '/unit/runs', 'RunNowButton');
    }
  }, [config, confirm, onQueued, startRun, t, trigger]);

  let reason = '';
  if (config.error) reason = t('testsUnit.runNow.configFailed');
  else if (trigger && !trigger.can_start) {
    reason = t(BLOCKED_KEY[trigger.blocked_reason] ?? 'testsUnit.runNow.blockedOther', {
      vars: { run: trigger.live_run_no ?? '' },
    });
  }
  const disabled = busy || config.loading || !trigger?.can_start;

  return (
    <Tooltip title={reason}>
      {/* A disabled button fires no hover, so the wrapper carries the tooltip. */}
      <Box component="span" sx={{ display: 'inline-flex' }}>
        <DuncitButton variant="contained" startIcon={<PlayArrowIcon />} onClick={onClick} disabled={disabled} loading={busy}>
          {t('testsUnit.runNow.action')}
        </DuncitButton>
      </Box>
    </Tooltip>
  );
}
