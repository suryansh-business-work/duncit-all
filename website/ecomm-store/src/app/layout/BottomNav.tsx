import { Link as RouterLink, useLocation } from 'react-router';
import { Box, Stack } from '@mui/material';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import type { ReactNode } from 'react';
import { DuncitIconButton } from '@duncit/buttons';

import { useStoreSettings } from '../providers/StoreSettingsProvider';
import { paths } from '../../lib/paths';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';

interface NavItem {
  to: string;
  labelKey: string;
  icon: ReactNode;
  /** Other paths that light this tab up. */
  match: (pathname: string) => boolean;
}

const HOME: NavItem = { to: paths.home, labelKey: 'ecommStore.nav.home', icon: <HomeRoundedIcon />, match: (p) => p === '/' };
const SHOP_PREFIXES = ['/shop', '/c/', '/pet/', '/collections/', '/brand', '/search', '/p/'] as const;
const SHOP: NavItem = {
  to: paths.shop,
  labelKey: 'ecommStore.nav.shop',
  icon: <GridViewRoundedIcon />,
  match: (p) => SHOP_PREFIXES.some((prefix) => p.startsWith(prefix)),
};
const AUTOSHIP: NavItem = {
  to: paths.autoship,
  labelKey: 'ecommStore.nav.autoship',
  icon: <SyncRoundedIcon />,
  match: (p) => p.startsWith('/autoship'),
};
const PROFILE: NavItem = {
  to: paths.account,
  labelKey: 'ecommStore.nav.profile',
  icon: <PersonOutlineRoundedIcon />,
  match: (p) => p.startsWith('/account') || p === '/wishlist',
};

/** The phone's floating dark pill: Home, Shop, Autoship (when on), Profile. */
export function BottomNav() {
  const { t } = useStoreT();
  const { pathname } = useLocation();
  const { autoship_enabled: autoship } = useStoreSettings();
  if (pathname.startsWith(paths.checkout)) return null;
  const items = autoship ? [HOME, SHOP, AUTOSHIP, PROFILE] : [HOME, SHOP, PROFILE];
  return (
    <Box
      component="nav"
      aria-label={t('ecommStore.nav.label')}
      sx={{
        display: { xs: 'flex', md: 'none' },
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 'calc(12px + env(safe-area-inset-bottom))',
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ bgcolor: T.navBar, borderRadius: T.radius.pill, p: 0.75, boxShadow: T.shadow }}>
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <DuncitIconButton
              key={item.to}
              component={RouterLink}
              to={item.to}
              aria-label={t(item.labelKey)}
              aria-current={active ? 'page' : undefined}
              sx={{
                width: 48,
                height: 48,
                color: T.onBrand,
                bgcolor: active ? T.brand : 'transparent',
                '&:hover': { bgcolor: active ? T.brand : 'rgba(255,255,255,0.12)' },
              }}
            >
              {item.icon}
            </DuncitIconButton>
          );
        })}
      </Stack>
    </Box>
  );
}
