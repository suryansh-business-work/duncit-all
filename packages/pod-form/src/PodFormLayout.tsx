import type { ReactNode } from 'react';
import { Box, Grid } from '@mui/material';

interface Props {
  fields: ReactNode;
  /**
   * Live preview column. Given one, the form lays itself out in two columns;
   * omitted, it stays the single column a dialog needs.
   */
  preview?: ReactNode;
}

/** The form's columns: fields on the left, the sticky preview on the right. */
export default function PodFormLayout({ fields, preview }: Readonly<Props>) {
  return (
    <Grid container spacing={3} sx={{ alignItems: 'flex-start' }}>
      <Grid size={{ xs: 12, lg: preview ? 7 : 12 }}>{fields}</Grid>
      {preview && (
        <Grid size={{ xs: 12, lg: 5 }}>
          {/* Scrolls inside itself: the detail preview is taller than the
              viewport on a long pod, and a plain sticky box would park its
              bottom out of reach. */}
          <Box
            sx={{
              position: { lg: 'sticky' },
              top: 16,
              maxHeight: { lg: 'calc(100vh - 32px)' },
              overflowY: { lg: 'auto' },
            }}
          >
            {preview}
          </Box>
        </Grid>
      )}
    </Grid>
  );
}
