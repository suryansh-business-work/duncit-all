import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export interface AccountInfoRowProps {
  icon: ReactNode;
  label: string;
  value: string;
}

export default function AccountInfoRow({ icon, label, value }: Readonly<AccountInfoRowProps>) {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body1">{value}</Typography>
      </Box>
    </Stack>
  );
}
