import type { ReactNode } from 'react';
import { Box, Divider, Stack, Typography } from '@mui/material';

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
    <Stack direction="row" spacing={1.5} data-testid={testId} sx={{ alignItems: 'center', py: 1.5 }}>
      <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'text.secondary', display: 'block' }}
        >
          {label}
        </Typography>
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, mt: '2px' }}>{value}</Typography>
      </Box>
    </Stack>
  );
}

/** A card's rows as one list, a hairline between each. Native twin:
 * `InfoRowList` in components/pod-pending/InfoRow.tsx (rule 27). */
export function InfoRowList({ rows }: Readonly<{ rows: readonly InfoRowProps[] }>) {
  return (
    <Stack divider={<Divider />}>
      {rows.map((row) => (
        <InfoRow key={row.label} {...row} />
      ))}
    </Stack>
  );
}
