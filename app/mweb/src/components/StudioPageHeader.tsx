import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

interface Props {
  /** The glyph inside the gradient mark — an MUI icon at `fontSize="small"`. */
  icon: ReactNode;
  title: string;
  caption: string;
  /** Optional trailing control (a "New venue" button, say). */
  action?: ReactNode;
}

/**
 * The partner-studio page header: a 38px gradient mark, the h4 title and a
 * caption under it. Venue Studio, its availability calendar and its settings
 * page all open with this one strip, so the three cannot drift (rule 40).
 */
export default function StudioPageHeader({ icon, title, caption, action }: Readonly<Props>) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: 'primary.contrastText',
          background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {caption}
        </Typography>
      </Box>
      {action}
    </Stack>
  );
}
