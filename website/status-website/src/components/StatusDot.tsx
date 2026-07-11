import { Box } from '@mui/material';
import type { Theme } from '@mui/material/styles';

export type DotState = 'success' | 'warning' | 'error' | 'info';

function dotColor(state: DotState, theme: Theme): string {
  const byState: Record<DotState, string> = {
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.text.disabled,
  };
  return byState[state];
}

export default function StatusDot({ state, size = 10 }: Readonly<{ state: DotState; size?: number }>) {
  return (
    <Box
      component="span"
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'inline-block',
        bgcolor: (theme) => dotColor(state, theme),
      }}
    />
  );
}
