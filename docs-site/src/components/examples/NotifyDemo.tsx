import { Button, Stack } from '@mui/material';
import { NotifyHost, notify, notifyError, notifySuccess } from '@duncit/dialogs';

/**
 * `notify()` dispatches a `duncit:notify` event; `NotifyHost` renders it.
 * That is why the buttons below are plain functions with no hook and no
 * context — and why nothing at all happens if the host is missing.
 */
export function NotifyDemo() {
  return (
    <Stack direction="row" flexWrap="wrap" sx={{ gap: 1 }}>
      <Button variant="outlined" onClick={() => notify('Payout queued for the next settlement run.')}>
        notify
      </Button>
      <Button variant="outlined" color="success" onClick={() => notifySuccess('Pod DUN-POD-4821 approved.')}>
        notifySuccess
      </Button>
      <Button variant="outlined" color="error" onClick={() => notifyError('Wallet credit failed — retry in 30s.')}>
        notifyError
      </Button>
      <NotifyHost />
    </Stack>
  );
}
