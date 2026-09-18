import type { ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, body, action }: Readonly<EmptyStateProps>) {
  return (
    <Stack spacing={1.5} sx={{ alignItems: 'center', py: 8, px: 2, textAlign: 'center' }}>
      <Stack sx={{ color: 'text.secondary', '& svg': { fontSize: 56 } }} aria-hidden>
        {icon}
      </Stack>
      <Typography variant="h3" component="p">
        {title}
      </Typography>
      {body ? (
        <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
          {body}
        </Typography>
      ) : null}
      {action}
    </Stack>
  );
}
