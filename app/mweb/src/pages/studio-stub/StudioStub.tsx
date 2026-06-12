import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

interface Props {
  icon: ReactNode;
  title: string;
  subtitle: string;
}

/** Lightweight "coming soon" scaffold for studio pages not yet built out. */
export default function StudioStub({ icon, title, subtitle }: Readonly<Props>) {
  return (
    <Stack spacing={2} alignItems="center" sx={{ maxWidth: 560, mx: 'auto', py: 8, px: 2, textAlign: 'center' }}>
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: 4,
          display: 'grid',
          placeItems: 'center',
          color: 'primary.contrastText',
          background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)',
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 950 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    </Stack>
  );
}
