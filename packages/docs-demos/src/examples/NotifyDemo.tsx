import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { NotifyHost, notify, notifyError, notifySuccess } from '@duncit/dialogs';

/**
 * `notify()` dispatches a `duncit:notify` event; `NotifyHost` renders it.
 * That is why the buttons below are plain functions with no hook and no
 * context — and why nothing at all happens if the host is missing.
 */
export function NotifyDemo() {
  return (
    <Stack
      direction="row"
      sx={{
        flexWrap: "wrap",
        gap: 1
      }}>
      <DuncitButton variant="outlined" onClick={() => notify('Payout queued for the next settlement run.')}>
        notify
      </DuncitButton>
      <DuncitButton variant="outlined" color="success" onClick={() => notifySuccess('Pod DUN-POD-4821 approved.')}>
        notifySuccess
      </DuncitButton>
      <DuncitButton variant="outlined" color="error" onClick={() => notifyError('Wallet credit failed — retry in 30s.')}>
        notifyError
      </DuncitButton>
      <NotifyHost />
    </Stack>
  );
}
