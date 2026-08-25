import { Box } from '@mui/material';
import { tokens } from '@duncit/theme';
import { useTranslation } from '../i18n/useTranslation';
import { TaskbarClock } from './TaskbarClock';
import { TaskbarWindows } from './TaskbarWindows';

/**
 * The strip along the bottom of every console.
 *
 * It is a row of the shell's own column rather than a `position: fixed` bar, so
 * the page above it is genuinely shorter instead of scrolling underneath it —
 * a fixed bar over a scrolling page hides the last row of every table, and no
 * amount of bottom padding gets that right on all seventeen consoles.
 */
export function Taskbar() {
  const { t } = useTranslation();

  return (
    <Box
      component="footer"
      aria-label={t('shell.taskbar.label')}
      sx={{
        height: `${tokens.size.taskbarHeight}px`,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        // Above the sidebar's drawer paper, which is fixed to the viewport.
        zIndex: (theme) => theme.zIndex.drawer + 3,
      }}
    >
      <TaskbarWindows />
      <Box sx={{ flex: 1 }} />
      <TaskbarClock />
    </Box>
  );
}
