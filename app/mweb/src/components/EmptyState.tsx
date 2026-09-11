import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';

interface Props {
  /** The one icon — drawn muted on a soft disc. */
  icon: ReactNode;
  /** The one line the empty state says. */
  title: string;
  /** Optional green CTA; needs `onAction`. */
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * The calm empty state every list shares: one icon on a soft disc, one line,
 * an optional green pill. Native twin: components/EmptyState.
 */
export default function EmptyState({ icon, title, actionLabel, onAction }: Readonly<Props>) {
  return (
    <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', py: 6, px: 3 }}>
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'action.hover',
          color: 'text.secondary',
          '& svg': { fontSize: 36 },
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ fontSize: '1rem', fontWeight: 600 }}>{title}</Typography>
      {actionLabel && onAction ? (
        <DuncitButton variant="contained" size="large" onClick={onAction}>
          {actionLabel}
        </DuncitButton>
      ) : null}
    </Stack>
  );
}
