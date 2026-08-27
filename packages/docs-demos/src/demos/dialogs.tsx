import { useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmProvider, NotifyProvider, useConfirm, useNotify } from '@duncit/dialogs';
import { defineDemo, defineDemos } from '../types';

interface ConfirmMock {
  title: string;
  message: string;
  confirmLabel: string;
  destructive: boolean;
}

/**
 * Hoisted to module scope: a component defined inside another component is
 * remounted on every render, which would close the very dialog it opened.
 */
function ConfirmStage({ mock }: Readonly<{ mock: ConfirmMock }>) {
  const confirm = useConfirm();
  const { notify } = useNotify();
  const [answer, setAnswer] = useState<string>('—');

  const ask = async () => {
    const ok = await confirm({
      title: mock.title,
      message: mock.message,
      confirmLabel: mock.confirmLabel,
      destructive: mock.destructive,
    });
    setAnswer(ok ? 'confirmed' : 'cancelled');
    notify(ok ? 'Pod cancelled' : 'Nothing changed', ok ? 'success' : 'info');
  };

  return (
    <Stack direction="row" spacing={2} sx={{
      alignItems: "center"
    }}>
      <DuncitButton variant="contained" color={mock.destructive ? 'error' : 'primary'} onClick={ask}>
        {mock.title}
      </DuncitButton>
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        Last answer: <strong>{answer}</strong>
      </Typography>
    </Stack>
  );
}

export default defineDemos('dialogs', [
  defineDemo<ConfirmMock>({
    id: 'confirm',
    title: 'useConfirm — a promise, not a callback tree',
    note:
      'Press it. The dialog resolves to true/false, so the caller reads like ordinary code — and the toast comes from the same package.',
    mock: {
      title: 'Cancel this pod?',
      message: 'All 7 attendees are refunded in full and the venue slot is released.',
      confirmLabel: 'Cancel pod',
      destructive: true,
    },
    render: (mock) => (
      <NotifyProvider>
        <ConfirmProvider>
          <ConfirmStage mock={mock} />
        </ConfirmProvider>
      </NotifyProvider>
    ),
  }),
]);
