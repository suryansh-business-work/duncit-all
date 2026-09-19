import { Link as RouterLink, useLocation } from 'react-router';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import MicOutlinedIcon from '@mui/icons-material/MicOutlined';
import type { ReactElement } from 'react';
import { useWebT } from '../../shared/i18n';
import { paths } from '../lib/paths';
import { NAV_ITEMS } from './header/nav';

const ICONS: Record<string, ReactElement> = {
  [paths.discover]: <ExploreOutlinedIcon />,
  [paths.tickets]: <ConfirmationNumberOutlinedIcon />,
  [paths.hosting]: <MicOutlinedIcon />,
  [paths.calendars]: <CalendarMonthOutlinedIcon />,
};

/** The phone's bottom bar: the four places plus Create in the middle. */
export function BottomNav() {
  const { t } = useWebT();
  const { pathname } = useLocation();
  const active = NAV_ITEMS.find((item) => item.match(pathname))?.to ?? false;
  const [discover, tickets, hosting, calendars] = NAV_ITEMS;
  const order = [discover, tickets, null, hosting, calendars];
  return (
    <Paper
      component="nav"
      aria-label={t('liteWeb.nav.label')}
      elevation={3}
      square
      sx={{ display: { xs: 'block', md: 'none' }, position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: (theme) => theme.zIndex.appBar, pb: 'env(safe-area-inset-bottom)' }}
      data-testid="bottom-nav"
    >
      <BottomNavigation value={active} showLabels sx={{ height: 64 }}>
        {order.map((item) =>
          item ? (
            <BottomNavigationAction
              key={item.to}
              component={RouterLink}
              to={item.to}
              value={item.to}
              label={t(item.labelKey)}
              icon={ICONS[item.to]}
              aria-current={active === item.to ? 'page' : undefined}
              sx={{ minWidth: 0 }}
              data-testid={`bottom-nav-${item.to.slice(1)}`}
            />
          ) : (
            <BottomNavigationAction
              key="create"
              component={RouterLink}
              to={paths.create}
              value={paths.create}
              label={t('liteWeb.nav.create')}
              icon={<AddCircleOutlineIcon sx={{ color: 'primary.main', fontSize: 30 }} />}
              sx={{ minWidth: 0 }}
              data-testid="bottom-nav-create"
            />
          ),
        )}
      </BottomNavigation>
    </Paper>
  );
}
