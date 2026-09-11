import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

interface Props {
  /** The glyph inside the round mark — an MUI icon at `fontSize="small"`. */
  icon: ReactNode;
  title: string;
  /** Optional trailing control (a "New venue" button, say). */
  action?: ReactNode;
}

/**
 * The partner-studio page header: a 40px round mark carrying the accent glyph,
 * and the page title beside it. Venue Studio, its availability calendar, its
 * settings page and the Club Admin pages all open with this one strip, so they
 * cannot drift (rule 40).
 */
export default function StudioPageHeader({ icon, title, action }: Readonly<Props>) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: 'secondary.main',
          bgcolor: 'background.paper',
          border: '1px solid var(--duncit-card-border)',
          boxShadow: 'var(--duncit-card-shadow)',
        }}
      >
        {icon}
      </Box>
      <Typography
        variant="h5"
        component="h1"
        noWrap
        sx={{ flex: 1, minWidth: 0, fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.2 }}
      >
        {title}
      </Typography>
      {action}
    </Stack>
  );
}
