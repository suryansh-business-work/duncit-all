import { Link as RouterLink, useLocation } from 'react-router';
import { Box, Container, Link, Stack, Toolbar } from '@mui/material';
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';
import { useWebT } from '../../../shared/i18n';
import { useLiteSession } from '../../../shared/session';
import { LITE_MOTION } from '../../../shared/tokens';
import { paths } from '../../lib/paths';
import { AccountMenu } from './AccountMenu';
import { LiteLogo } from './LiteLogo';
import { LocalClock } from './LocalClock';
import { ModeToggle } from './ModeToggle';
import { visibleNavItems } from './nav';
import { NavDrawer } from './NavDrawer';

const LINK_SX = {
  px: { xs: 1, sm: 1.25 },
  minHeight: 40,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.75,
  borderRadius: 1,
  fontWeight: 700,
  fontSize: '0.95rem',
  transition: `color ${LITE_MOTION.fast}ms, background-color ${LITE_MOTION.fast}ms`,
  '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
} as const;

/** Events · Calendars · Discover · Pricing, icon and word, from a laptop up. */
function NavLinks() {
  const { t } = useWebT();
  const { pathname } = useLocation();
  const { signedIn } = useLiteSession();
  return (
    // Below a laptop the menu drawer carries these places (and on a phone the bottom tab bar too).
    <Stack component="nav" aria-label={t('liteWeb.nav.label')} direction="row" spacing={{ xs: 0, sm: 0.5 }} sx={(theme) => ({ [theme.breakpoints.down('md')]: { display: 'none' } })}>
      {visibleNavItems(signedIn).map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            component={RouterLink}
            to={item.to}
            underline="none"
            aria-current={active ? 'page' : undefined}
            aria-label={t(item.labelKey)}
            sx={{ ...LINK_SX, color: active ? 'text.primary' : 'text.secondary' }}
            data-testid={`nav-${item.to.slice(1)}`}
          >
            <Icon fontSize="small" aria-hidden />
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {t(item.labelKey)}
            </Box>
          </Link>
        );
      })}
    </Stack>
  );
}

/** "Create event" for a signed-in reader, "Explore events" for a visitor. */
function PrimaryLink() {
  const { t } = useWebT();
  const { signedIn } = useLiteSession();
  if (!signedIn) {
    return (
      <Link component={RouterLink} to={paths.discover} underline="none" sx={{ ...LINK_SX, color: 'text.secondary', display: { xs: 'none', sm: 'inline-flex' } }} data-testid="header-explore">
        {t('liteWeb.nav.explore')}
        <ArrowOutwardIcon sx={{ fontSize: 16 }} aria-hidden />
      </Link>
    );
  }
  return (
    <Link component={RouterLink} to={paths.create} underline="none" sx={(theme) => ({ ...LINK_SX, color: 'text.primary', [theme.breakpoints.down('sm')]: { display: 'none' } })} data-testid="header-create">
      {t('liteWeb.nav.create')}
    </Link>
  );
}

/** A slim, see-through header over the glow: the menu (below a laptop), logo, the places, the clock, Create and the account. */
export function Header() {
  return (
    <Box
      component="header"
      sx={(theme) => ({
        position: 'sticky',
        top: 0,
        zIndex: theme.zIndex.appBar,
        backdropFilter: 'saturate(140%) blur(12px)',
        backgroundColor: `rgba(${theme.vars?.palette.background.defaultChannel} / 0.72)`,
      })}
    >
      <Container maxWidth={false} sx={{ maxWidth: 1240 }}>
        <Toolbar disableGutters sx={{ gap: { xs: 0.5, sm: 1.5 }, minHeight: { xs: 56, md: 60 } }}>
          <NavDrawer />
          <LiteLogo />
          <NavLinks />
          <Box sx={{ flexGrow: 1 }} />
          <LocalClock />
          <ModeToggle />
          <PrimaryLink />
          <AccountMenu />
        </Toolbar>
      </Container>
    </Box>
  );
}
