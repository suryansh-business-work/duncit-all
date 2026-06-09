import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

export interface InfoRowItem {
  label: string;
  value: ReactNode;
}

/** Compact label/value list used inside the Server detail cards. */
export default function InfoList({ rows }: Readonly<{ rows: InfoRowItem[] }>) {
  return (
    <Stack>
      {rows.map((row, i) => (
        <Stack
          key={row.label}
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
          sx={{
            py: 1,
            borderTop: i === 0 ? 0 : 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ flexShrink: 0 }}>
            {row.label}
          </Typography>
          <Box sx={{ textAlign: 'right', wordBreak: 'break-word', minWidth: 0 }}>
            {typeof row.value === 'string' || typeof row.value === 'number' ? (
              <Typography variant="body2">{row.value}</Typography>
            ) : (
              row.value
            )}
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}
