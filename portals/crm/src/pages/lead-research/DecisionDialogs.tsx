import { useState } from 'react';
import { Alert, Checkbox, DialogContentText, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import { ConfirmDialog } from '@duncit/dialogs';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import type { CandidateActions } from './useCandidateActions';

/** What the server keeps of a decision note. */
const NOTE_MAX = 300;

interface Props {
  actions: CandidateActions;
}

/** Add to CRM: only qualified non-duplicates go in unless the person ticks the box. */
function ApproveDialog({ actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const [allowUnqualified, setAllowUnqualified] = useState(false);
  const count = actions.pending?.ids.length ?? 0;
  return (
    <ConfirmDialog
      open
      title={t('crm.leadResearch.approveTitle', { count })}
      message={
        <Stack spacing={1.5}>
          <DialogContentText>{t('crm.leadResearch.approveBody')}</DialogContentText>
          <Stack spacing={0.25}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={allowUnqualified}
                  onChange={(event) => setAllowUnqualified(event.target.checked)}
                  disabled={actions.busy}
                />
              }
              label={t('crm.leadResearch.allowUnqualified')}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('crm.leadResearch.allowUnqualifiedHint')}
            </Typography>
          </Stack>
          {actions.error ? <Alert severity="error">{actions.error}</Alert> : null}
        </Stack>
      }
      confirmLabel={t('crm.leadResearch.addToCrm')}
      busyLabel={t('crm.common.adding')}
      busy={actions.busy}
      onConfirm={() => fireAndForget(actions.approve(allowUnqualified), logs.portal.crm, 'LeadResearch', 'approveCandidates')}
      onClose={actions.close}
    />
  );
}

/** Reject: dismissed from the queue, with an optional note on why. */
function RejectDialog({ actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const count = actions.pending?.ids.length ?? 0;
  return (
    <ConfirmDialog
      open
      destructive
      title={t('crm.leadResearch.rejectTitle', { count })}
      message={
        <Stack spacing={1.5}>
          <DialogContentText>{t('crm.leadResearch.rejectBody')}</DialogContentText>
          <TextField
            value={note}
            onChange={(event) => setNote(event.target.value)}
            label={t('crm.leadResearch.rejectNote')}
            helperText={t('crm.leadResearch.rejectNoteHint', { vars: { max: NOTE_MAX } })}
            size="small"
            multiline
            minRows={2}
            fullWidth
            disabled={actions.busy}
            slotProps={{ htmlInput: { maxLength: NOTE_MAX, 'data-testid': 'reject-note' } }}
          />
          {actions.error ? <Alert severity="error">{actions.error}</Alert> : null}
        </Stack>
      }
      confirmLabel={t('crm.leadResearch.reject')}
      busyLabel={t('crm.common.working')}
      busy={actions.busy}
      onConfirm={() => fireAndForget(actions.reject(note), logs.portal.crm, 'LeadResearch', 'rejectCandidates')}
      onClose={actions.close}
    />
  );
}

/** The confirmation for whichever decision is pending; mounted fresh each time, so the box and note start empty. */
export default function DecisionDialogs({ actions }: Readonly<Props>) {
  if (actions.pending?.kind === 'approve') return <ApproveDialog actions={actions} />;
  if (actions.pending?.kind === 'reject') return <RejectDialog actions={actions} />;
  return null;
}
