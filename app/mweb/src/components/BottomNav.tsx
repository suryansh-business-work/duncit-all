import { useEffect, useRef, type ReactNode } from 'react';
import { Badge, Box, Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import { alpha } from '@mui/material/styles';
import HomeIcon from '@mui/icons-material/Home';
import ExploreIcon from '@mui/icons-material/Explore';
import GroupsIcon from '@mui/icons-material/Groups';
import StoreIcon from '@mui/icons-material/Store';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useLocation, useNavigate } from 'react-router';
import { CART_BADGE_MAX } from '@duncit/utils';
import { useProductVisibility } from '@duncit/app-settings';
import { APP_SHELL_MAX_WIDTH } from '../app/appLayout';
import { useCart } from './cart/CartContext';
import { useTranslation } from '../i18n/useTranslation';

const CART_PATH = '/cart';

/** The four destinations that are always in the bar. Chats and Following moved
 * into the account menu; a visitor reaches a space to meet and their basket
 * from here instead. */
const TABS = [
  { value: '/', labelKey: 'mweb.nav.home', icon: <HomeIcon /> },
  { value: '/explore', labelKey: 'mweb.nav.explore', icon: <ExploreIcon /> },
  { value: '/clubs', labelKey: 'mweb.nav.clubs', icon: <GroupsIcon /> },
  { value: '/venues', labelKey: 'mweb.nav.venues', icon: <StoreIcon /> },
];

/** The fifth, and only while there is something to buy. With products off the
 * remaining four keep the whole bar — MUI gives every action `flex: 1`, so they
 * redistribute on their own rather than leaving a gap where the cart was. */
const CART_TAB = { value: CART_PATH, labelKey: 'mweb.nav.cart', icon: <ShoppingCartIcon /> };

/**
 * One tab's glyph. Every tab is drawn through the badge, not just the cart:
 * MUI renders nothing for `badgeContent={0}`, so a single branchless wrapper
 * carries the cart count and leaves the other four untouched.
 */
function NavIcon({ icon, count }: Readonly<{ icon: ReactNode; count: number }>) {
  return (
    <Box className="nav-icon-wrap">
      <Badge badgeContent={count} color="secondary" max={CART_BADGE_MAX}>
        {icon}
      </Badge>
    </Box>
  );
}

const NAV_BOTTOM_GAP = 0;
const NAV_CONTENT_GAP = 56;
const NAV_OVERLAY_GAP = 10;

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { totalCount } = useCart();
  const { visible: productsVisible } = useProductVisibility();
  const paperRef = useRef<HTMLDivElement | null>(null);
  const tabs = productsVisible ? [...TABS, CART_TAB] : TABS;

  useEffect(() => {
    const node = paperRef.current;
    if (!node || globalThis.window === undefined) return undefined;
    const root = document.documentElement;
    const updateOffset = () => {
      const height = Math.ceil(node.getBoundingClientRect().height);
      const overlayOffset = height + NAV_BOTTOM_GAP + NAV_OVERLAY_GAP;
      const contentOffset = height + NAV_BOTTOM_GAP + NAV_CONTENT_GAP;
      root.style.setProperty('--duncit-bottom-nav-height', `${height}px`);
      root.style.setProperty('--duncit-bottom-nav-offset', `${overlayOffset}px`);
      root.style.setProperty('--duncit-bottom-nav-overlay-offset', `${overlayOffset}px`);
      root.style.setProperty('--duncit-bottom-nav-content-offset', `${contentOffset}px`);
    };
    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(node);
    window.addEventListener('resize', updateOffset);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateOffset);
      root.style.removeProperty('--duncit-bottom-nav-height');
      root.style.removeProperty('--duncit-bottom-nav-offset');
      root.style.removeProperty('--duncit-bottom-nav-overlay-offset');
      root.style.removeProperty('--duncit-bottom-nav-content-offset');
    };
  }, []);

  // Match the active tab from the path. Club/pod detail (/club/:slug…) maps to
  // Clubs; pages that don't belong to a tab highlight none (not Home).
  const matchActive = (): string | false => {
    if (pathname === '/') return '/';
    if (pathname.startsWith('/explore')) return '/explore';
    if (pathname.startsWith('/clubs') || pathname.startsWith('/club/')) return '/clubs';
    // `/venue/:id` too — a venue's own page belongs to the tab that lists them.
    if (pathname.startsWith('/venue')) return '/venues';
    if (pathname.startsWith(CART_PATH)) return CART_PATH;
    return false;
  };
  const active = matchActive();

  // Edge-to-edge flat surface bar — full width, no radius, active tab in the
  // coral accent. Light: no top line, a faint lift; dark: the card hairline
  // (`--duncit-card-border` is transparent in light), the shadow sinks into
  // the ground. Native's BottomNav draws the same bar.
  return (
    <Paper
      ref={paperRef}
      elevation={0}
      square
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        width: '100%',
        bottom: 0,
        zIndex: (t) => t.zIndex.appBar,
        border: 0,
        borderTop: '1px solid var(--duncit-card-border)',
        borderRadius: 0,
        overflow: 'hidden',
        p: 0,
        pb: 'env(safe-area-inset-bottom)',
        bgcolor: 'background.paper',
        boxShadow: (theme) => `0 -2px 12px ${alpha(theme.palette.common.black, 0.06)}`,
      }}
    >
      <BottomNavigation
        showLabels
        value={active}
        onChange={(_e, value) => navigate(value)}
        sx={{
          height: 64,
          border: 0,
          width: '100%',
          maxWidth: APP_SHELL_MAX_WIDTH,
          mx: 'auto',
          bgcolor: 'transparent',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 0,
            mx: 0,
            px: 0.25,
            py: 0.5,
            borderRadius: 0,
            color: 'text.secondary',
            transition: 'color 180ms ease',
          },
          '& .MuiBottomNavigationAction-root.Mui-selected': {
            color: 'secondary.main',
          },
          '& .nav-icon-wrap': {
            width: 44,
            height: 28,
            display: 'grid',
            placeItems: 'center',
            mb: 0.25,
          },
          '& .nav-icon-wrap .MuiSvgIcon-root': {
            fontSize: 24,
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: 11,
            fontWeight: 600,
            mt: 0,
          },
          '& .MuiBottomNavigationAction-label.Mui-selected': {
            fontSize: 11,
            color: 'secondary.main',
          },
        }}
      >
        {tabs.map((tab) => (
          <BottomNavigationAction
            key={tab.value}
            value={tab.value}
            label={t(tab.labelKey)}
            icon={<NavIcon icon={tab.icon} count={tab.value === CART_PATH ? totalCount : 0} />}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
