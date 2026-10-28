import { useId, type ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { tint } from '../../../../shared/theme';
import { LITE_RADII } from '../../../../shared/tokens';

interface FieldPanelProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  testId: string;
}

/** One soft, translucent block of the event form (When, Where, Description, Options), labelled by its title. */
export function FieldPanel({ icon, title, children, testId }: Readonly<FieldPanelProps>) {
  const titleId = useId();
  return (
    <Box
      component="section"
      aria-labelledby={titleId}
      sx={(theme) => ({
        p: 1.75,
        borderRadius: `${LITE_RADII.card}px`,
        bgcolor: tint(theme.palette.common.white, 0.05),
        border: 1,
        borderColor: 'divider',
        backdropFilter: 'blur(8px)',
        ...theme.applyStyles('light', { bgcolor: tint(theme.palette.common.black, 0.03) }),
      })}
      data-testid={testId}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25, color: 'text.secondary' }}>
        <Box aria-hidden sx={{ display: 'flex' }}>
          {icon}
        </Box>
        <Typography id={titleId} variant="body2" component="h2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      </Stack>
      {children}
    </Box>
  );
}
