import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';

interface Props<T extends { id: string }> {
  items: T[];
  /** Shown in a dashed box when there are no items. */
  emptyText: string;
  children: (item: T) => ReactNode;
}

/** A responsive grid of image tiles (2 / 3 / 4 across), or an empty state. */
export default function ImageGrid<T extends { id: string }>({ items, emptyText, children }: Readonly<Props<T>>) {
  if (items.length === 0) {
    return (
      <Stack
        spacing={1}
        sx={{ alignItems: 'center', py: 4, border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: 2 }}
      >
        <ImageIcon color="disabled" />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {emptyText}
        </Typography>
      </Stack>
    );
  }
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          sm: 'repeat(3, minmax(0, 1fr))',
          lg: 'repeat(4, minmax(0, 1fr))',
        },
      }}
    >
      {items.map((item) => (
        <Box key={item.id} sx={{ minWidth: 0, display: 'flex' }}>
          {children(item)}
        </Box>
      ))}
    </Box>
  );
}
