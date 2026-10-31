import { useId, type ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { mergeSx } from '../mergeSx';

export interface EmptyStateProps {
  /** A glyph drawn on a soft tile above the title. */
  icon?: ReactNode;
  title: ReactNode;
  /** One or two lines under the title: what would fill this, and how. */
  body?: ReactNode;
  /** The primary way forward — usually the create button. */
  action?: ReactNode;
  /** A quieter alternative beside it — a link to the docs, a filter reset. */
  secondaryAction?: ReactNode;
  /** Tighter padding, for a panel or a table body rather than a whole page. */
  compact?: boolean;
  sx?: SxProps<Theme>;
  'data-testid'?: string;
}

/**
 * What a list, a table or a panel shows when it holds nothing yet.
 *
 * A plain `section` named by its title, not a live region: the state is static
 * once drawn, and announcing it would talk over whatever the person was doing.
 * Naming it lets a screen reader land on it from the landmark list.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
  secondaryAction,
  compact = false,
  sx,
  'data-testid': testId = 'empty-state',
}: Readonly<EmptyStateProps>) {
  const titleId = useId();
  const tile = compact ? 40 : 56;
  return (
    <Box
      component="section"
      aria-labelledby={titleId}
      data-testid={testId}
      sx={mergeSx({ display: 'grid', placeItems: 'center', textAlign: 'center', px: 2, py: compact ? 3 : 6 }, sx)}
    >
      <Stack spacing={compact ? 1 : 1.5} sx={{ alignItems: 'center', maxWidth: 420 }}>
        {icon && (
          <Box
            aria-hidden
            data-testid={`${testId}-icon`}
            sx={{
              width: tile,
              height: tile,
              borderRadius: 2,
              bgcolor: 'action.hover',
              color: 'text.secondary',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {icon}
          </Box>
        )}
        <Typography id={titleId} component="p" variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {body != null && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {body}
          </Typography>
        )}
        {(action || secondaryAction) && (
          <Stack direction="row" sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1, pt: 0.5 }}>
            {action}
            {secondaryAction}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
