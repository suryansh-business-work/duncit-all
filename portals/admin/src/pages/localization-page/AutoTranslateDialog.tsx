import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import AutoTranslateProgress from './AutoTranslateProgress';
import AutoTranslateScope from './AutoTranslateScope';
import {
  AUTO_TRANSLATE_JOB,
  AUTO_TRANSLATE_PENDING,
  CANCEL_AUTO_TRANSLATE,
  START_AUTO_TRANSLATE,
  type AutoTranslateJobRow,
  type LocaleRow,
} from './queries';

/** How often a live run is re-read. Slow enough to be free, fast enough to move. */
const POLL_MS = 3000;

interface Props {
  open: boolean;
  locale: LocaleRow | null;
  onClose: () => void;
  /** Fired when a run reaches a final state, so the coverage column refreshes. */
  onFinished: () => void;
}

/**
 * Auto-translate one language with OpenAI.
 *
 * The run itself lives on the server (see autoTranslate.service), so this
 * dialog only starts it, polls the row and stops it — closing the window does
 * not stop anything, and re-opening it finds the same run still going.
 */
export default function AutoTranslateDialog({
  open,
  locale,
  onClose,
  onFinished,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  const skip = !open || !locale || locale.is_default;

  const { data: jobData, refetch: refetchJob, startPolling, stopPolling } = useQuery<any>(
    AUTO_TRANSLATE_JOB,
    { variables: { locale: locale?.code ?? '' }, skip, fetchPolicy: 'network-only' },
  );
  const { data: pendingData, refetch: refetchPending } = useQuery<any>(AUTO_TRANSLATE_PENDING, {
    variables: { locale: locale?.code ?? '', replace_existing: replaceExisting },
    skip,
    fetchPolicy: 'network-only',
  });

  const [start, { loading: starting }] = useMutation<any>(START_AUTO_TRANSLATE);
  const [cancel, { loading: cancelling }] = useMutation<any>(CANCEL_AUTO_TRANSLATE);

  const job: AutoTranslateJobRow | null = jobData?.autoTranslateJob ?? null;
  const running = job?.status === 'RUNNING';
  const pending: number | null = pendingData?.autoTranslatePending ?? null;

  // Opening for another language must not inherit the last one's choice.
  useEffect(() => {
    if (!open) return;
    setOpError(null);
    setReplaceExisting(false);
  }, [open]);

  useEffect(() => {
    if (running) startPolling(POLL_MS);
    else stopPolling();
    return () => stopPolling();
  }, [running, startPolling, stopPolling]);

  // A finished run means the language just gained text: the parent's coverage
  // column and this dialog's own "how many are left" count are both stale.
  useEffect(() => {
    if (!job || job.status === 'RUNNING') return;
    onFinished();
    refetchPending().catch(() => undefined);
  }, [job, onFinished, refetchPending]);

  const run = async () => {
    if (!locale) return;
    setOpError(null);
    try {
      await start({ variables: { locale: locale.code, replace_existing: replaceExisting } });
      await refetchJob();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : t('admin.localization.startFailed'));
    }
  };

  const stop = async () => {
    if (!job) return;
    setOpError(null);
    try {
      await cancel({ variables: { id: job.id } });
      await refetchJob();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : t('admin.localization.stopFailed'));
    }
  };

  const isDefault = locale?.is_default === true;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {t('admin.localization.autoTranslateOn', { vars: { language: locale?.label ?? '' } })}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {isDefault && <Alert severity="info">{t('admin.localization.autoTranslateDefault')}</Alert>}
          {!isDefault && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('admin.localization.autoTranslateIntro')}
            </Typography>
          )}
          {opError && <Alert severity="error">{opError}</Alert>}
          {!isDefault && !running && (
            <AutoTranslateScope
              replaceExisting={replaceExisting}
              onChange={setReplaceExisting}
              pending={pending}
            />
          )}
          {job && <AutoTranslateProgress job={job} />}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
        {running && (
          <DuncitButton color="error" disabled={cancelling} onClick={stop}>
            {t('admin.localization.stopRun')}
          </DuncitButton>
        )}
        {!isDefault && !running && (
          <DuncitButton variant="contained" disabled={starting || pending === 0} onClick={run}>
            {starting ? t('admin.localization.startingRun') : t('admin.localization.startRun')}
          </DuncitButton>
        )}
      </DialogActions>
    </Dialog>
  );
}
