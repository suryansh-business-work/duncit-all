import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

interface Props {
  icon?: ReactNode;
  title: string;
  /** One line under the title saying what the page is for. */
  subtitle?: string;
}

/** The heading of a Loyalty form page: what it is and what it changes. */
export default function PageHeading({ icon, title, subtitle }: Readonly<Props>) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      {icon}
      <Box>
        <Typography component="h1" variant="h5" sx={{ fontWeight: 900 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 720 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
