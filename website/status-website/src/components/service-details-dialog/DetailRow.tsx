import type { ReactNode } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';

export function DetailRow({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  const content =
    typeof value === 'string' ? <Typography variant="body2">{value}</Typography> : value;
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      gap={2}
      py={0.9}
      sx={{ borderBottom: 1, borderColor: 'divider', '&:last-of-type': { borderBottom: 0 } }}
    >
      <Typography variant="body2" color="text.secondary" fontWeight={700}>
        {label}
      </Typography>
      <Box sx={{ maxWidth: '62%', textAlign: 'right', overflowWrap: 'anywhere' }}>{content}</Box>
    </Stack>
  );
}

export function StatusPill({ ok, label }: Readonly<{ ok: boolean; label: string }>) {
  return <Chip size="small" color={ok ? 'success' : 'error'} label={label} />;
}

export function SectionTitle({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Typography
      variant="overline"
      color="text.secondary"
      display="block"
      sx={{ letterSpacing: '0.1em', fontWeight: 700, mt: 2, '&:first-of-type': { mt: 0 } }}
    >
      {children}
    </Typography>
  );
}
