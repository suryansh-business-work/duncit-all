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
import { useTranslation, type Translate } from '@duncit/shell';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { EnvironmentChip } from '../components/RunStatusChip';
import { STRESS_TRIGGER_CONFIG, TRIGGER_STRESS_RUN, type StressTriggerConfig } from '../queries';
import NewStressRunForm, { NEW_STRESS_RUN_FORM_ID } from './new-stress-run.form';
import { toTriggerInput, type NewStressRunValues } from './new-stress-run.types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called with the new run's id, so the page can open its live view. */
  onStarted: (id: string) => void;
}

/** Why a run cannot start from here, in words — or null when it can. */
function blockedMessage(t: Translate, config: StressTriggerConfig): string | null {
  if (config.blocked_reason === 'LOCAL') return t('tech.stress.blockedLocal');
  if (config.blocked_reason === 'TARGET') return t('tech.stress.blockedTarget', { vars: { mweb: config.target_mweb_url, api: config.target_graphql_url } });
  if (config.blocked_reason === 'GITHUB') return t('tech.stress.blockedGithub');
  if (!config.can_start) return t('tech.stress.blockedRole');
  if (config.live_run_no) return t('tech.stress.blockedLive', { vars: { run: config.live_run_no } });
  return null;
}

/**
 * Start a stress run against THIS portal's environment.
 *
 * The dialog opens even when a run cannot start, and says why — a disabled
 * button with no reason is the same dead end as a missing feature.
 */
export default function NewStressRunDialog({ open, onClose, onStarted }: Readonly<Props>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const { data, loading, error } = useQuery<{ stressTriggerConfig: StressTriggerConfig }>(STRESS_TRIGGER_CONFIG, {
    skip: !open,
    fetchPolicy: 'network-only',
  });
  const [trigger] = useMutation<{ triggerStressRun: { id: string; run_no: string } }>(TRIGGER_STRESS_RUN);
  const config = data?.stressTriggerConfig ?? null;
  const blocked = config ? blockedMessage(t, config) : null;
  const ready = Boolean(config) && !blocked;

  const submit = async (values: NewStressRunValues) => {
    if (!config) return;
    setBusy(true);
    try {
      const input = toTriggerInput(values, { required: config.requires_confirmation, text: config.confirm_text });
      const res = await trigger({ variables: { input } });
      const run = res.data?.triggerStressRun;
      notifySuccess(t('tech.stress.started', { vars: { run: run?.run_no ?? '' } }));
      onClose();
      if (run) onStarted(run.id);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <span>{t('tech.stress.newRunTitle')}</span>
          {config && <EnvironmentChip environment={config.environment} />}
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {t('tech.stress.newRunSubtitle')}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {loading && !config && <CircularProgress size={24} />}
        {error && <Alert severity="error">{error.message}</Alert>}
        {blocked && <Alert severity="warning">{blocked}</Alert>}
        {ready && config && (
          <Stack spacing={2}>
            <NewStressRunForm config={config} onSubmit={submit} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('tech.stress.targets', {
                vars: { mweb: config.target_mweb_url, api: config.target_graphql_url, repository: config.repository, ref: config.ref },
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
          form={NEW_STRESS_RUN_FORM_ID}
          variant="contained"
          color="error"
          loading={busy}
          disabled={!ready}
        >
          {t('tech.stress.startRun')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
