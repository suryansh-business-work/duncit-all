import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';

interface Props {
  status?: string | null;
  busy: boolean;
  onWithdraw: () => Promise<void> | void;
}

export default function HostWithdrawApplication({ status, busy, onWithdraw }: Props) {
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
        action={<Button color="inherit" size="small" disabled={busy} onClick={() => setOpen(true)}>Withdraw</Button>}
      >
        You can withdraw this host application until it is approved.
      </Alert>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Withdraw host application?</DialogTitle>
        <DialogContent>
          <Stack spacing={1}>
            <Typography variant="body2">Your host application will move back to draft and can be edited before submitting again.</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button color="warning" variant="contained" disabled={busy} onClick={confirm}>Withdraw</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}