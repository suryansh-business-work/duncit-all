import { useState } from 'react';
import { Paper, Stack, TextField, Typography } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { isOpenRun } from './copy';
import type { MarketingRunDecision, MarketingRunState } from './queries';
import { useRunActions } from './useRunActions';

interface DecideProps {
  busy: boolean;
  onDecide: (decision: MarketingRunDecision, note: string) => void;
}

/** Approve, or stop the run with a reason. The note is what the requester reads. */
function DecideSection({ busy, onDecide }: Readonly<DecideProps>) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const [noteMissing, setNoteMissing] = useState(false);

  const decide = (decision: MarketingRunDecision) => {
    const trimmed = note.trim();
    if (decision !== 'APPROVED' && !trimmed) {
      setNoteMissing(true);
      return;
    }
    setNoteMissing(false);
    onDecide(decision, trimmed);
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="marketing-run-decide">
      <Typography component="h3" variant="subtitle2">
        {t('marketing.runs.decideTitle')}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 1.5 }}>
        {t('marketing.runs.decideHint')}
      </Typography>
      <TextField
        label={t('marketing.runs.note')}
        value={note}
        onChange={(event) => {
          setNote(event.target.value);
          if (noteMissing && event.target.value.trim()) setNoteMissing(false);
        }}
        multiline
        minRows={2}
        fullWidth
        error={noteMissing}
        helperText={noteMissing ? t('marketing.runs.noteRequired') : t('marketing.runs.noteHint')}
        sx={{ mb: 1.5 }}
      />
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <DuncitButton variant="contained" color="success" disabled={busy} onClick={() => decide('APPROVED')}>
          {t('marketing.runs.approve')}
        </DuncitButton>
        <DuncitButton variant="outlined" disabled={busy} onClick={() => decide('CHANGES_REQUESTED')}>
          {t('marketing.runs.requestChanges')}
        </DuncitButton>
        <DuncitButton variant="outlined" color="error" disabled={busy} onClick={() => decide('REJECTED')}>
          {t('marketing.runs.reject')}
        </DuncitButton>
      </Stack>
    </Paper>
  );
}

interface Props {
  run: MarketingRunState;
  /** The run changed on the server — read it again. */
  onChanged: () => void;
}

/**
 * What a person can do to this run right now: retry it once it has failed,
 * stop it while it is still going, and decide it while it waits on them.
 * Nothing renders for a run that offers none of the three.
 */
export default function RunActions({ run, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { busy, retry, cancel, decide } = useRunActions(run.id, onChanged);
  const canCancel = isOpenRun(run.status);
  if (!run.can_retry && !canCancel) return null;

  const cancelRun = async () => {
    const ok = await confirm({
      title: t('marketing.runs.cancelTitle'),
      message: t('marketing.runs.cancelMessage'),
      confirmLabel: t('marketing.runs.cancel'),
      destructive: true,
    });
    if (ok) await cancel();
  };

  return (
    <Stack spacing={1.5} data-testid="marketing-run-actions">
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {run.can_retry && (
          <DuncitButton variant="contained" startIcon={<ReplayIcon />} disabled={busy} onClick={retry}>
            {t('marketing.runs.retry')}
          </DuncitButton>
        )}
        {canCancel && (
          <DuncitButton
            variant="outlined"
            color="error"
            startIcon={<StopCircleOutlinedIcon />}
            disabled={busy || run.cancel_requested}
            onClick={cancelRun}
          >
            {t('marketing.runs.cancel')}
          </DuncitButton>
        )}
      </Stack>
      {run.status === 'AWAITING_APPROVAL' && <DecideSection busy={busy} onDecide={decide} />}
    </Stack>
  );
}
