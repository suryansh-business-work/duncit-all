import { useId, useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { LEAD_LIMITS } from '../copy';

interface Props {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  /** True when the lead was marked lost — only then does the dialog close. */
  onConfirm: (note: string) => Promise<boolean>;
}

/** Losing a lead needs a reason, which is kept as a note on it. */
export default function LostNoteDialog({ open, busy, onClose, onConfirm }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const trimmed = note.trim();
  const error = (() => {
    if (!trimmed) return t('marketing.leads.lostReasonRequired');
    if (trimmed.length > LEAD_LIMITS.note) return t('marketing.leads.tooLong', { vars: { max: LEAD_LIMITS.note } });
    return '';
  })();

  const confirm = async () => {
    setTouched(true);
    if (error) return;
    if (await onConfirm(trimmed)) {
      setNote('');
      setTouched(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby={titleId} data-testid="lead-lost-dialog">
      <DialogTitle id={titleId}>{t('marketing.leads.lostTitle')}</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          multiline
          minRows={2}
          label={t('marketing.leads.lostReason')}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => setTouched(true)}
          error={touched && error !== ''}
          helperText={touched ? error : ' '}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={busy}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton variant="contained" color="error" onClick={confirm} loading={busy} data-testid="lead-lost-confirm">
          {t('marketing.leads.markLost')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
