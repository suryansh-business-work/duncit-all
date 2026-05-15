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

const TABS = [
  { value: '/', label: 'Home', icon: <HomeIcon /> },
  { value: '/explore', label: 'Explore', icon: <ExploreIcon /> },
  { value: '/clubs', label: 'Clubs', icon: <GroupsIcon /> },
  { value: '/chats', label: 'Chats', icon: <ChatBubbleOutlineIcon /> },
  { value: '/follow', label: 'Following', icon: <FavoriteBorderIcon /> },
];

const NAV_BOTTOM_GAP = 8;
const NAV_CONTENT_GAP = 16;

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const paperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = paperRef.current;
    if (!node || typeof window === 'undefined') return undefined;
    const root = document.documentElement;
    const updateOffset = () => {
      const height = Math.ceil(node.getBoundingClientRect().height);
      const offset = height + NAV_BOTTOM_GAP + NAV_CONTENT_GAP;
      root.style.setProperty('--duncit-bottom-nav-height', `${height}px`);
      root.style.setProperty('--duncit-bottom-nav-offset', `${offset}px`);
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
    };
  }, []);

  // Match the top-level segment so /clubs/:id still highlights "Clubs", etc.
  const active =
    TABS.slice()
      .sort((a, b) => b.value.length - a.value.length)
      .find((t) => (t.value === '/' ? pathname === '/' : pathname.startsWith(t.value)))
      ?.value ?? '/';

  return (
    <Paper
      ref={paperRef}
      elevation={8}
      sx={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        width: { xs: 'calc(100% - 18px)', sm: 'calc(100% - 24px)' },
        maxWidth: APP_SHELL_MAX_WIDTH - 24,
        bottom: NAV_BOTTOM_GAP,
        zIndex: (t) => t.zIndex.appBar,
        border: 0,
        borderRadius: 4,
        overflow: 'hidden',
        p: 0.5,
        pb: 'calc(env(safe-area-inset-bottom) + 4px)',
        bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.88 : 0.96),
        backdropFilter: 'blur(18px)',
        boxShadow: (theme) => theme.palette.mode === 'dark'
          ? '0 18px 44px rgba(0,0,0,0.48)'
          : '0 18px 44px rgba(15,23,42,0.16)',
      }}
    >
      <BottomNavigation
        showLabels
        value={active}
        onChange={(_e, value) => navigate(value)}
        sx={{
          height: 58,
          border: 0,
          bgcolor: 'transparent',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 0,
            mx: 0.15,
            px: 0.25,
            py: 0.4,
            borderRadius: 3,
            color: 'text.secondary',
            transition: 'background-color 160ms ease, color 160ms ease, transform 160ms ease',
          },
          '& .MuiBottomNavigationAction-root.Mui-selected': {
            color: 'primary.main',
            bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.08),
          },
          '& .nav-icon-wrap': {
            width: 30,
            height: 30,
            borderRadius: 2.25,
            display: 'grid',
            placeItems: 'center',
            mb: 0.1,
            transition: 'background 160ms ease, box-shadow 160ms ease, color 160ms ease',
          },
          '& .Mui-selected .nav-icon-wrap': {
            color: 'primary.contrastText',
            background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 55%, #f5337a 100%)',
            boxShadow: '0 8px 18px rgba(245,51,122,0.34)',
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: 11,
            fontWeight: 800,
            mt: 0,
          },
          '& .MuiBottomNavigationAction-label.Mui-selected': {
            fontSize: 11,
          },
        }}
      >
        {TABS.map((t) => (
          <BottomNavigationAction
            key={t.value}
            value={t.value}
            label={t.label}
            icon={<Box className="nav-icon-wrap">{t.icon}</Box>}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
