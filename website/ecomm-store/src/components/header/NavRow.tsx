import { Link as RouterLink, useLocation } from 'react-router';
import { Box, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';

import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { isInternalLink, paths } from '../../lib/paths';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';
import { NewTabHint } from '../footer/NewTabHint';
import { MegaMenu } from './mega-menu';
import { useNavigationData } from './navigation';

/** How many top aisles fit beside the pet menu before the row would wrap. */
const MAX_AISLES = 6;

const LINK_SX = {
  flexShrink: 0,
  color: T.ink,
  fontWeight: 700,
  px: 1.5,
  position: 'relative',
  '&[aria-current="page"]': { color: T.ctaInk },
  '&[aria-current="page"]::after': {
    content: '""',
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 4,
    height: 3,
    borderRadius: T.radius.pill,
    bgcolor: T.brand,
  },
} as const;

/** A store path routes in-app and marks the page it is on; anything else opens in a new tab and says so. */
function NavLink({ to, label, active }: Readonly<{ to: string; label: string; active: boolean }>) {
  return (
    <Box component="li">
      {isInternalLink(to) ? (
        <DuncitButton component={RouterLink} to={to} aria-current={active ? 'page' : undefined} sx={LINK_SX}>
          {label}
        </DuncitButton>
      ) : (
        <DuncitButton href={to} target="_blank" rel="noopener noreferrer" sx={LINK_SX}>
          {label}
          <NewTabHint />
        </DuncitButton>
      )}
    </Box>
  );
}

/**
 * The desktop nav row: the red "Shop by pet" pill, then the operator's links
 * (Settings), or the top aisles, Deals and Brands when it set none.
 */
export function NavRow() {
  const { t } = useStoreT();
  const { pathname } = useLocation();
  const nav = useNavigationData();
  const { nav_links: operatorLinks } = useStoreSettings();
  const aisles = nav.categories.filter((c) => c.show_in_menu).slice(0, MAX_AISLES);
  const links =
    operatorLinks.length > 0
      ? operatorLinks.map((l) => ({ key: `op-${l.label}-${l.link}`, to: l.link, label: l.label }))
      : [
          ...aisles.map((c) => ({ key: c.id, to: paths.category(c.slug), label: c.name })),
          { key: 'deals', to: paths.deals, label: t('ecommStore.menu.deals') },
          { key: 'brands', to: paths.brands, label: t('ecommStore.menu.brands') },
        ];
  return (
    <Stack component="nav" direction="row" spacing={1} aria-label={t('ecommStore.menu.main')} sx={{ alignItems: 'center', minWidth: 0, py: 1 }}>
      <MegaMenu nav={nav} />
      <Stack component="ul" direction="row" spacing={0.5} sx={{ listStyle: 'none', m: 0, px: 0.5, py: 0.5, minWidth: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {links.map((link) => (
          <NavLink key={link.key} to={link.to} label={link.label} active={pathname === link.to} />
        ))}
      </Stack>
    </Stack>
  );
}
