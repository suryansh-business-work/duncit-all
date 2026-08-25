import { useState } from 'react';
import { ButtonBase, Popover, Stack, Typography } from '@mui/material';
import { useTranslation } from '../i18n/useTranslation';
import { ClockTray } from './ClockTray';
import { useWorkspace } from './context';
import { useTaskbarClock } from './useTaskbarClock';

/**
 * The clock at the right-hand end of the taskbar.
 *
 * Two lines, the way a desktop draws it: the time above the date, both in the
 * admin-configured patterns and in whichever zone this reader chose. Clicking
 * it opens the tray, where the zone, the seconds and the language are set.
 */
export function TaskbarClock() {
  const { t } = useTranslation();
  const workspace = useWorkspace();
  const clock = useTaskbarClock(workspace?.clockZone ?? '', workspace?.clockSeconds ?? false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <ButtonBase
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-label={t('shell.taskbar.clockLabel')}
        sx={{
          px: 1,
          py: 0.25,
          borderRadius: 1,
          textAlign: 'right',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Stack sx={{ alignItems: 'flex-end', lineHeight: 1.15 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.15 }}>
            {clock.time}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.15 }}>
            {clock.date}
          </Typography>
        </Stack>
      </ButtonBase>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {/* Mounted only while open: it ticks once a second, and a closed tray
            has no reason to keep re-rendering behind the page. */}
        {Boolean(anchor) && <ClockTray full={clock.full} zone={clock.zone} />}
      </Popover>
    </>
  );
}
