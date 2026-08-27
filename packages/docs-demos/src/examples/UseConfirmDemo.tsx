import { useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmProvider, useConfirm } from '@duncit/dialogs';

/** Anything below the provider can `await` a decision — no local open state. */
function DeleteLocationButton() {
  const confirm = useConfirm();
  const [result, setResult] = useState('—');

  const onDelete = async () => {
    const ok = await confirm({
      title: 'Delete location',
      message: 'Delete location "Indiranagar 12th Main"?',
      destructive: true,
      confirmLabel: 'Delete',
    });
    setResult(ok ? 'resolved true → the mutation runs' : 'resolved false → nothing happens');
  };

  return (
    <Stack sx={{ gap: 1, alignItems: 'flex-start' }}>
      <DuncitButton variant="outlined" color="error" onClick={onDelete}>
        Delete location
      </DuncitButton>
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        {result}
      </Typography>
    </Stack>
  );
}

/** The provider is mounted once at the portal root; shown inline here. */
export function UseConfirmDemo() {
  return (
    <ConfirmProvider>
      <DeleteLocationButton />
    </ConfirmProvider>
  );
}
