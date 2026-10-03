import type { ReactNode } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';

interface Props {
  title: string;
  description?: string;
  /** Rendered at the heading's right — an Edit button, a count. */
  action?: ReactNode;
  testId: string;
  children: ReactNode;
}

/** One titled card on the profile page — every tab is a stack of these. */
export function ProfileSection({ title, description, action, testId, children }: Readonly<Props>) {
  return (
    <Paper
      component="section"
      variant="outlined"
      data-testid={testId}
      aria-label={title}
      sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', mb: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {description}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>
      {children}
    </Paper>
  );
}
