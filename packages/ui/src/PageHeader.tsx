import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { mergeSx } from './mergeSx';

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-side slot (filters / buttons). Wraps the block in a space-between row. */
  actions?: ReactNode;
  /** Default 'h5'. */
  titleVariant?: 'h4' | 'h5' | 'h6';
  /** Default 800. */
  titleWeight?: number;
  sx?: SxProps<Theme>;
}

/**
 * The standard page title + subtitle block used at the top of dashboards and
 * list pages across every portal.
 */
export function PageHeader({ title, subtitle, actions, titleVariant = 'h5', titleWeight = 800, sx }: Readonly<PageHeaderProps>) {
  const block = (
    <Box>
      <Typography variant={titleVariant} sx={{ fontWeight: titleWeight }}>
        {title}
      </Typography>
      {subtitle != null && (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Box>
  );
  if (actions) {
    return (
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" sx={mergeSx({ gap: 2 }, sx)}>
        {block}
        <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
          {actions}
        </Stack>
      </Stack>
    );
  }
  return <Box sx={sx}>{block}</Box>;
}
