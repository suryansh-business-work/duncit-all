import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

export interface InfoRowProps {
  icon: ReactNode;
  label: string;
  value: string;
  testId?: string;
}

/** "icon · label / value" line used by every card on the waiting page.
 * Native twin: components/pod-pending/InfoRow.tsx (rule 27). */
export default function InfoRow({ icon, label, value, testId }: Readonly<InfoRowProps>) {
  return (
    <Stack direction="row" spacing={1} data-testid={testId} sx={{
      alignItems: "flex-start"
    }}>
      <Box sx={{ color: 'text.secondary', display: 'flex', mt: '2px' }}>{icon}</Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: "text.secondary",
            display: "block"
          }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{
          fontWeight: 700
        }}>
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}
