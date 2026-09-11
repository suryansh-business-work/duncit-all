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
    <Stack
      spacing={2}
      sx={{
        alignItems: "center",
        maxWidth: 560,
        mx: 'auto',
        py: 8,
        px: 2,
        textAlign: 'center'
      }}>
      <Box
        sx={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: 'secondary.main',
          bgcolor: 'background.paper',
          '& svg': { fontSize: 44 },
        }}
      >
        {icon}
      </Box>
      <Typography component="h1" sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{subtitle}</Typography>
    </Stack>
  );
}
