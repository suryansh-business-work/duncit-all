import { useEffect, useState, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useUserData } from '@duncit/user-context';
import {
  AppBar,
  Avatar,
  Box,
  CircularProgress,
  Drawer,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import { useColorMode } from '../ColorModeContext';
import { appConfig } from '../config/app-config';
import { clearToken, hasAppAccess } from '../lib/session';
import AppSidebar from './AppSidebar';
import AppBreadcrumbs from './AppBreadcrumbs';

export const DRAWER_WIDTH = 256;
export const HEADER_HEIGHT = 48;

const initials = (user: any) => {
  const name = user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || appConfig.name;
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      /* v8 ignore next -- name is always non-empty here, so the join never falls through */
      .join('') || appConfig.name[0]
  );
};

export default function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const colorMode = useColorMode();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user: account, loading, logout: ctxLogout } = useUserData();

  const logout = () => {
    // ctxLogout already clears all storage + redirects to /login. We still
    // call clearToken() so app-specific token-key logic stays in one place.
    clearToken();
    ctxLogout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    if (account && !hasAppAccess(account.roles)) {
      clearToken();
      navigate('/login?denied=1', { replace: true });
    }
  }, [account, navigate]);

  if (loading && !account) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: 'background.default' }}>
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }} aria-label="primary navigation">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          <AppSidebar onNavigate={() => setMobileOpen(false)} />
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}
        >
          <AppSidebar />
        </Drawer>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar sx={{ minHeight: `${HEADER_HEIGHT}px !important`, gap: 1, px: { xs: 1.25, sm: 2 } }}>
            {!isDesktop && (
              <IconButton size="small" edge="start" onClick={() => setMobileOpen(true)} aria-label="open navigation">
                <MenuIcon />
              </IconButton>
            )}
            <Box component={RouterLink} to="/" sx={{ color: 'inherit', textDecoration: 'none', minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle2" fontWeight={800} noWrap>
                {appConfig.fullName}
              </Typography>
            </Box>
            <Tooltip title={`Switch to ${colorMode.mode === 'light' ? 'dark' : 'light'} mode`}>
              <IconButton size="small" onClick={colorMode.toggle} aria-label="toggle color mode">
                {colorMode.mode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Avatar src={account?.profile_photo || undefined} sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: 12 }}>
              {initials(account)}
            </Avatar>
            <Tooltip title="Logout">
              <IconButton size="small" onClick={logout} aria-label="logout">
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
        <AppBreadcrumbs />
        <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 1.5, sm: 2.25, md: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
