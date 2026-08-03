import { useEffect, useRef } from 'react';
import { Box, Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import { alpha } from '@mui/material/styles';
import HomeIcon from '@mui/icons-material/Home';
import ExploreIcon from '@mui/icons-material/Explore';
import GroupsIcon from '@mui/icons-material/Groups';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useLocation, useNavigate } from 'react-router-dom';
import { APP_SHELL_MAX_WIDTH } from '../app/appLayout';
import { useTranslation } from '../i18n/useTranslation';

const TABS = [
  { value: '/', labelKey: 'mweb.nav.home', icon: <HomeIcon /> },
  { value: '/explore', labelKey: 'mweb.nav.explore', icon: <ExploreIcon /> },
  { value: '/clubs', labelKey: 'mweb.nav.clubs', icon: <GroupsIcon /> },
  { value: '/chats', labelKey: 'mweb.nav.chats', icon: <ChatBubbleOutlineIcon /> },
  { value: '/follow', labelKey: 'mweb.nav.following', icon: <FavoriteBorderIcon /> },
];

const NAV_BOTTOM_GAP = 0;
const NAV_CONTENT_GAP = 56;
const NAV_OVERLAY_GAP = 10;

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const paperRef = useRef<HTMLDivElement | null>(null);

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
    if (pathname.startsWith('/chats')) return '/chats';
    if (pathname.startsWith('/follow')) return '/follow';
    return false;
  };
  const active = matchActive();

  // Edge-to-edge flat bar — full width, no radius, active tab in primary.
  return (
    <Paper
      ref={paperRef}
      elevation={8}
      square
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        width: '100%',
        bottom: 0,
        zIndex: (t) => t.zIndex.appBar,
        border: 0,
        borderTop: 1,
        borderColor: 'divider',
        borderRadius: 0,
        overflow: 'hidden',
        p: 0,
        pb: 'env(safe-area-inset-bottom)',
        bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.92 : 0.98),
        backdropFilter: 'blur(18px)',
        boxShadow: (theme) => theme.palette.mode === 'dark'
          ? '0 -10px 30px rgba(0,0,0,0.42)'
          : '0 -10px 30px rgba(15,23,42,0.10)',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
      }}
    >
      <BottomNavigation
        showLabels
        value={active}
        onChange={(_e, value) => navigate(value)}
        sx={{
          height: 60,
          border: 0,
          width: '100%',
          maxWidth: APP_SHELL_MAX_WIDTH,
          mx: 'auto',
          bgcolor: 'transparent',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 0,
            mx: 0,
            px: 0.25,
            py: 0.4,
            borderRadius: 0,
            color: 'text.secondary',
            transition: 'color 200ms ease, transform 200ms ease',
          },
          '& .MuiBottomNavigationAction-root.Mui-selected': {
            color: 'primary.main',
            transform: 'translateY(-1px)',
          },
          '& .nav-icon-wrap': {
            width: 44,
            height: 30,
            display: 'grid',
            placeItems: 'center',
            mb: 0.1,
            borderRadius: 999,
            transition: 'all 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          },
          // Active tab = primary tint only, no background shape (user ask).
          '& .Mui-selected .nav-icon-wrap': {
            color: 'primary.main',
            transform: 'translateY(-1px)',
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: 11,
            fontWeight: 600,
            mt: 0,
            transition: 'color 200ms ease',
          },
          '& .MuiBottomNavigationAction-label.Mui-selected': {
            fontSize: 11,
            color: 'primary.main',
          },
        }}
      >
        {TABS.map((tab) => (
          <BottomNavigationAction
            key={tab.value}
            value={tab.value}
            label={t(tab.labelKey)}
            icon={<Box className="nav-icon-wrap">{tab.icon}</Box>}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
