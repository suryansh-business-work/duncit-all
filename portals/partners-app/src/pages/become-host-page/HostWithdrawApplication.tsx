import { useState } from 'react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props {
  status?: string | null;
  busy: boolean;
  onWithdraw: () => Promise<void> | void;
}

export default function HostWithdrawApplication({ status, busy, onWithdraw }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!status || status === 'APPROVED') return null;

  const confirm = async () => {
    await onWithdraw();
    setOpen(false);
  };

  return (
    <>
      <Alert
        severity="warning"
        action={<DuncitButton color="inherit" size="small" disabled={busy} onClick={() => setOpen(true)}>{t('partners.becomeHostPage.withdraw')}</DuncitButton>}
      >
        You can withdraw this host application until it is approved.
      </Alert>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('partners.becomeHostPage.withdrawHostApplication')}</DialogTitle>
        <DialogContent>
          <Stack spacing={1}>
            <Typography variant="body2">{t('partners.becomeHostPage.yourHostApplicationWillMoveBack')}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={() => setOpen(false)}>{t('shell.common.cancel')}</DuncitButton>
          <DuncitButton color="warning" variant="contained" disabled={busy} onClick={confirm}>{t('partners.becomeHostPage.withdraw')}</DuncitButton>
        </DialogActions>
      </Dialog>
    </>
  );
}