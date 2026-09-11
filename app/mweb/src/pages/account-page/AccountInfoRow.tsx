import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import IconDisc from './IconDisc';

export interface AccountInfoRowProps {
  icon: ReactNode;
  label: string;
  value: string;
}

export default function AccountInfoRow({ icon, label, value }: Readonly<AccountInfoRowProps>) {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', px: 2, py: 1.5 }}>
      <IconDisc>{icon}</IconDisc>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 15, overflowWrap: 'anywhere' }}>{value}</Typography>
      </Box>
    </Stack>
  );
}
