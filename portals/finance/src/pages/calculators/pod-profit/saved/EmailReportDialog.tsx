import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { isEmail } from '@duncit/regex';
import { useTranslation } from '@duncit/app-settings';
import { EMAIL_POD_CALCULATOR } from './queries';

interface Props {
  open: boolean;
  calculatorId: string;
  calculatorName: string;
  onClose: () => void;
}

/**
 * Emails the saved calculation's PDF report.
 *
 * The server builds and attaches the PDF, so what lands in the inbox is byte
 * for byte the file the Download button produces — one renderer, two doors.
 */
export default function EmailReportDialog({
  open,
  calculatorId,
  calculatorName,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [to, setTo] = useState('');
  const [send, sendState] = useMutation<any>(EMAIL_POD_CALCULATOR);

  const address = to.trim();
  const valid = isEmail(address);

  const onSend = () => {
    send({ variables: { calculator_doc_id: calculatorId, to: address } })
      .then(() => {
        notifySuccess(t('finance.calculators.reportEmailed'));
        setTo('');
        onClose();
        return undefined;
      })
      .catch((error: Error) => notifyError(error.message));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('finance.calculators.emailReport')}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {calculatorName}
          </Typography>
          <TextField
            label={t('finance.calculators.sendTo')}
            type="email"
            size="small"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            error={address.length > 0 && !valid}
            helperText={t('finance.calculators.sendToHint')}
            autoFocus
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={sendState.loading}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton
          variant="contained"
          onClick={onSend}
          disabled={!valid || sendState.loading}
        >
          {sendState.loading ? t('finance.calculators.sending') : t('finance.calculators.send')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
