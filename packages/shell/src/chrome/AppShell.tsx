import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Drawer } from '@mui/material';
import { tokens } from '@duncit/theme';
import { AppBreadcrumbs, BreadcrumbProvider } from '@duncit/breadcrumb';
import type { AppNavItem, SearchItem } from '../types';
import { AppHeader } from './AppHeader';
import type { ShellTool } from './AppsDrawer/tools';
import { StaffChatPanel } from '../staff-chat';
import { STAFF_CHAT_ROLES } from '../staff-chat/roles';
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
  /** Extra entries for the header's apps drawer, beside the platform's own. */
  tools?: ShellTool[];
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
  tools,
  children,
}: Readonly<AppShellProps>) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  // The chat is DOCKED, so its open state belongs to the layout rather than to
  // the button: the panel is a sibling of the main content, and opening it
  // narrows that content instead of covering it.
  const [chatOpen, setChatOpen] = useState(false);
  const isStaff = (user?.roles ?? []).some((role) => STAFF_CHAT_ROLES.has(role));

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
    /*
      A FIXED viewport, not a growing page.
      With minHeight the document itself scrolled, so nothing inside could have
      a scrollbar of its own: the chat panel was as tall as the page and rode up
      and down with it, and the header went with it. Pinning the shell to the
      viewport gives the page body and the chat one scroller each, which is the
      only way the two can move independently.
    */
    <Box sx={{ display: 'flex', height: '100dvh', overflow: 'hidden', bgcolor: 'background.default' }}>
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
          tools={tools}
          chatOpen={chatOpen}
          onToggleChat={() => setChatOpen((current) => !current)}
        />
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <BreadcrumbProvider>
              <AppBreadcrumbs nav={nav} appName={config.name} labelMap={breadcrumbLabelMap} />
              {/* The page's own scroller. `contain` stops a wheel that reaches
                  the end of this box from carrying on into the chat beside it —
                  scroll chaining is what made the two feel welded together. */}
              <Box
                component="main"
                id={MAIN_ID}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 0,
                  overflowY: 'auto',
                  overscrollBehavior: 'contain',
                  p: { xs: 1.5, sm: 2.25, md: 3 },
                }}
              >
                {children}
              </Box>
            </BreadcrumbProvider>
          </Box>
          {/* Mounted whether or not it is showing: the socket that carries an
              incoming call lives inside it, and a chat that only listens while
              its sidebar is open is a phone that only rings while you hold it.
              `open` decides what is on screen; the call window is separate and
              appears over the page either way. */}
          {isStaff && (
            <StaffChatPanel
              open={chatOpen}
              meId={user?.id ?? ''}
              meName={user?.full_name ?? user?.first_name ?? undefined}
              meRoles={user?.roles ?? []}
              onClose={() => setChatOpen(false)}
              onRequestOpen={() => setChatOpen(true)}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}
