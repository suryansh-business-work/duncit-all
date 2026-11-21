import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import CallEndIcon from '@mui/icons-material/CallEnd';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props {
  open: boolean;
  ending: boolean;
  onContinue: () => void;
  onEndAndClose: () => void;
}

/**
 * Asked when the call window is closed while the call is still live. "Continue
 * call" is the default and Escape / clicking outside choose it, so nothing ever
 * hangs up by accident; only "End call and close" ends the call.
 */
export default function CloseCallDialog({ open, ending, onContinue, onEndAndClose }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onContinue} aria-labelledby="close-call-title" aria-describedby="close-call-body" maxWidth="xs" fullWidth>
      <DialogTitle id="close-call-title">{t('crm.call.closeConfirmTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText id="close-call-body">{t('crm.call.closeConfirmBody')}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <DuncitButton variant="contained" onClick={onContinue} autoFocus disabled={ending}>
          {t('crm.call.continueCall')}
        </DuncitButton>
        <DuncitButton color="error" startIcon={<CallEndIcon />} onClick={onEndAndClose} disabled={ending}>
          {ending ? t('crm.call.ending') : t('crm.call.endAndClose')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
