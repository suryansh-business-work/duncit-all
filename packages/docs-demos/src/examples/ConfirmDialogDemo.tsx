import { useState } from 'react';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog } from '@duncit/dialogs';

/**
 * `<ConfirmDialog>` used directly — the open state is owned by the caller,
 * which is the only reason to reach for it over `useConfirm()`.
 */
export function ConfirmDialogDemo() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const onConfirm = () => {
    setBusy(true);
    globalThis.setTimeout(() => {
      setBusy(false);
      setOpen(false);
    }, 1600);
  };

  return (
    <Stack direction="row" sx={{ gap: 1 }}>
      <DuncitButton variant="contained" color="error" onClick={() => setOpen(true)}>
        Cancel pod
      </DuncitButton>
      <ConfirmDialog
        open={open}
        title="Cancel this pod?"
        message="All 7 booked guests are refunded in full and the venue slot is released. This cannot be undone."
        confirmLabel="Cancel pod"
        cancelLabel="Keep it"
        destructive
        busy={busy}
        busyLabel="Cancelling…"
        titleSx={{ fontWeight: 800 }}
        onConfirm={onConfirm}
        onClose={() => setOpen(false)}
      />
    </Stack>
  );
}
