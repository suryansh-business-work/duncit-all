import type { ReactNode } from 'react';
import { Card, Divider, Stack } from '@mui/material';

interface Props {
  children: ReactNode;
  /** Theme colour path for a card that must stand out, e.g. `warning.main`. */
  borderColor?: string;
  testId?: string;
}

/**
 * One card of list rows with hairline dividers inset 16 between them — the calm
 * list group, instead of a stack of one-card-per-row boxes. Native twin:
 * components/host-manage/RowGroup.
 */
export default function RowGroup({ children, borderColor, testId }: Readonly<Props>) {
  return (
    <Card data-testid={testId} sx={{ overflow: 'hidden', borderColor }}>
      <Stack divider={<Divider sx={{ mx: 2 }} />}>{children}</Stack>
    </Card>
  );
}
