import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Drawer } from '@mui/material';
import { tokens } from '@duncit/theme';
import type { AppNavItem, SearchItem } from '../types';
import { AppBreadcrumbs } from './AppBreadcrumbs';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import type { ShellUser } from './user-display';

const MAIN_ID = 'app-main';
const drawerWidth = tokens.size.drawerWidth;

/** The slice of a portal's `appConfig` the chrome needs — pass appConfig directly. */
export interface AppShellPortalConfig {
  name: string;
  fullName?: string;
  footerCaption?: string;
}

export interface AppShellProps {
  config: AppShellPortalConfig;
  nav: AppNavItem[];
  /** Header-wide search entries; derived from `nav` when omitted. */
  searchItems?: SearchItem[];
  user?: ShellUser;
  onLogout: () => void;
  /** Route of the profile page; omit to hide the Profile menu item. */
  profileTo?: string;
  /** Portal-computed role gate; `false` (with a loaded user) redirects to /login?denied=1. */
  hasAccess?: boolean;
  /** User still loading — shows the boot spinner until the user arrives. */
  loading?: boolean;
  /** Called before the denied redirect (e.g. clear the auth token). */
  onDenied?: () => void;
  /** Route-segment → label overrides for the breadcrumbs. */
  breadcrumbLabelMap?: Record<string, string>;
  children: ReactNode;
}

/** The unified console layout every portal wraps its authed routes in. */
export function AppShell({
  config,
  nav,
  searchItems,
  user,
  onLogout,
  profileTo,
  hasAccess,
  loading,
  onDenied,
  breadcrumbLabelMap,
  children,
}: Readonly<AppShellProps>) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (user && hasAccess === false) {
      onDenied?.();
      navigate('/login?denied=1', { replace: true });
    }
  }, [user, hasAccess, navigate, onDenied]);

  if (loading && !user) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: 'background.default' }}>
      <Box
        component="a"
        href={`#${MAIN_ID}`}
        sx={{
          position: 'absolute',
          left: -9999,
          zIndex: (t) => t.zIndex.tooltip,
          bgcolor: 'background.paper',
          color: 'primary.main',
          px: 2,
          py: 1,
          borderRadius: 1,
          fontWeight: 700,
          '&:focus': { left: 8, top: 8 },
        }}
      >
        Skip to main content
      </Box>
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }} aria-label="primary navigation">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}
        >
          <AppSidebar
            name={config.name}
            nav={nav}
            user={user}
            footerCaption={config.footerCaption}
            onNavigate={() => setMobileOpen(false)}
          />
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' } }}
        >
          <AppSidebar name={config.name} nav={nav} user={user} footerCaption={config.footerCaption} />
        </Drawer>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppHeader
          title={config.fullName ?? config.name}
          name={config.name}
          nav={nav}
          searchItems={searchItems}
          user={user}
          profileTo={profileTo}
          onLogout={onLogout}
          onOpenMobileNav={() => setMobileOpen(true)}
        />
        <AppBreadcrumbs nav={nav} appName={config.name} labelMap={breadcrumbLabelMap} />
        <Box component="main" id={MAIN_ID} sx={{ flex: 1, minWidth: 0, p: { xs: 1.5, sm: 2.25, md: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
