import { Box, LinearProgress } from '@mui/material';
import { useTranslation } from '../../../i18n/useTranslation';

/** Height of the track, reserved whether or not the bar is running. */
const TRACK_HEIGHT = 2;

/**
 * The thin bar across the top of the menu while its data is being refreshed in
 * the background — the twin of native's <SidebarRefreshBar/>.
 *
 * The panel skeleton only stands in when there is nothing at all to show, which
 * on a warm cache is never: the header runs the same query on every page, so by
 * the time the menu opens the answer is already there. This is what says the
 * menu is re-reading anyway, without flashing a skeleton over content that is
 * already correct. The track keeps its height either way, so nothing shifts
 * when the bar appears.
 */
export default function MenuRefreshBar({ active }: Readonly<{ active: boolean }>) {
  const { t } = useTranslation();
  return (
    <Box data-testid="menu-refresh-bar" sx={{ height: TRACK_HEIGHT, overflow: 'hidden' }}>
      {active && (
        <LinearProgress aria-label={t('mweb.sidebar.refreshing')} sx={{ height: TRACK_HEIGHT }} />
      )}
    </Box>
  );
}
