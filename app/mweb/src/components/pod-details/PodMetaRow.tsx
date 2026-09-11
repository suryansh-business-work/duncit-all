import type { ReactNode } from 'react';
import { Box, Stack } from '@mui/material';

interface Props {
  /** A `@mui/icons-material` glyph — sized and tinted by the disc. */
  icon: ReactNode;
  children: ReactNode;
}

/**
 * One fact about a pod — when, where, what kind — as an icon in a soft disc
 * beside its text. The icon names the fact, so the row needs no caption.
 * Native twin: components/details/PodMetaRow.
 */
export default function PodMetaRow({ icon, children }: Readonly<Props>) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <Box
        aria-hidden
        sx={{
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: '50%',
          bgcolor: 'action.hover',
          color: 'secondary.main',
          display: 'grid',
          placeItems: 'center',
          '& svg': { fontSize: 20 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Stack>
  );
}
