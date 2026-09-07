import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import {
  E2E_SUITE_CATALOGUE,
  E2E_TRIGGER_CONFIG,
  TRIGGER_E2E_RUN,
  type E2eSuite,
  type E2eTriggerConfig,
} from '../queries';
import RunTestsForm, { RUN_TESTS_FORM_ID } from './run-tests.form';
import { toTriggerInput, type RunTestsValues } from './run-tests.types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called after a run is queued, so the table shows it without a reload. */
  onQueued: () => void;
}

/**
 * Start an e2e run from the portal.
 *
 * The dialog opens even when GitHub is not configured — the button that opens
 * it stays enabled and the reason appears HERE. A disabled button with no
 * explanation is the same dead end as a missing feature.
 */
export default function RunTestsDialog({ open, onClose, onQueued }: Readonly<Props>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const { data, loading } = useQuery<{ e2eTriggerConfig: E2eTriggerConfig }>(E2E_TRIGGER_CONFIG, {
    skip: !open,
    fetchPolicy: 'cache-and-network',
  });
  const catalogue = useQuery<{ e2eSuiteCatalogue: E2eSuite[] }>(E2E_SUITE_CATALOGUE, {
    skip: !open,
  });
  const [triggerRun] = useMutation<any>(TRIGGER_E2E_RUN);
  const config = data?.e2eTriggerConfig ?? null;
  const suites = catalogue.data?.e2eSuiteCatalogue ?? [];
  const ready = Boolean(config?.configured) && suites.length > 0;

  const submit = async (values: RunTestsValues) => {
    setBusy(true);
    try {
      const res = await triggerRun({
        variables: { input: toTriggerInput(values, suites.length) },
      });
      const queued = res.data?.triggerE2eRun;
      notifySuccess(t('tech.e2e.triggered', { vars: { run: queued?.run?.run_no ?? '' } }));
      onQueued();
      onClose();
    } catch (err) {
      // notifyError takes a STRING — handing it the error object white-screens
      // the portal, which has no error boundary above this.
      notifyError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        {t('tech.e2e.triggerTitle')}
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {t('tech.e2e.triggerSubtitle')}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {loading && !config && <CircularProgress size={24} />}
        {config && !config.configured && (
          <Alert severity="warning">{t('tech.e2e.githubNotConfigured')}</Alert>
        )}
        {ready && config && (
          <Stack spacing={2}>
            <RunTestsForm suites={suites} config={config} onSubmit={submit} />
            {/* Which repo this dispatches against and where the row will land.
                Both are worth stating: a run started on staging records itself
                in the portal it was started from, whatever branch it runs. */}
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('tech.e2e.triggerTargets', {
                vars: { repository: config.repository, server: config.reports_to },
              })}
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={busy}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton
          type="submit"
          form={RUN_TESTS_FORM_ID}
          variant="contained"
          disabled={busy || !ready}
        >
          {busy ? t('tech.e2e.triggering') : t('tech.e2e.triggerAction')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
