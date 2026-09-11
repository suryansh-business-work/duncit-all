import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import SectionHeader from '../../components/SectionHeader';

interface Props {
  title: string;
  /** How many rows the section holds — a muted figure beside the title. */
  count?: number;
  /** Trailing controls, e.g. the Your-pods filter pill. */
  children?: ReactNode;
}

/**
 * A Host Studio section's title row: the calm SectionHeader, the row count and
 * any trailing control. Every list on the page opens with this one strip, so
 * the sections cannot drift. Native twin: components/host-manage/HostSectionHeader.
 */
export default function HostSectionHeader({ title, count, children }: Readonly<Props>) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <SectionHeader title={title} />
      </Box>
      {count === undefined ? null : (
        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', fontWeight: 600 }}>
          {count}
        </Typography>
      )}
      {children}
    </Stack>
  );
}
