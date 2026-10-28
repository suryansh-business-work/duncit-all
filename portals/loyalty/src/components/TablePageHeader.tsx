import type { ReactNode } from 'react';
import { Chip, Stack, Typography } from '@mui/material';

interface Props {
  icon: ReactNode;
  title: string;
  /** Rows matching the current search and filters; hidden until the first page lands. */
  total: number | null;
  /** Right-hand controls (a picker, a "Generate" button). */
  actions?: ReactNode;
}

/** The heading every list page opens with: its icon, its name and how many rows match. */
export default function TablePageHeader({ icon, title, total, actions }: Readonly<Props>) {
  const heading = (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      {icon}
      <Typography component="h1" variant="h5" sx={{ fontWeight: 900 }}>
        {title}
      </Typography>
      {total != null && <Chip size="small" label={total} sx={{ ml: 1 }} />}
    </Stack>
  );
  if (!actions) return heading;
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
    >
      {heading}
      {actions}
    </Stack>
  );
}
