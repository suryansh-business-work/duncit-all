import { Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import { AskDuncitHandoverForm, type AskDuncitHandoverValues } from './handover-form';

interface Props {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (team: string, summary: string) => Promise<boolean>;
}

const FORM_ID = 'ask-duncit-handover';

/** "Talk to a person": the conversation becomes a ticket for the chosen team. */
export default function HandoverDialog({ open, busy, onClose, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const submit = async (values: AskDuncitHandoverValues) => {
    const ok = await onSubmit(values.team, values.summary);
    if (ok) onClose();
    return ok;
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="ask-duncit-handover-title">
      <DialogTitle id="ask-duncit-handover-title">{t('askDuncit.handover.title')}</DialogTitle>
      <DialogContent>{open && <AskDuncitHandoverForm formId={FORM_ID} onSubmit={submit} />}</DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('askDuncit.cancel')}</DuncitButton>
        <DuncitButton type="submit" form={FORM_ID} variant="contained" disabled={busy}>
          {t('askDuncit.handover.submit')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
