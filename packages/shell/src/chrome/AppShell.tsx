import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Box, CircularProgress } from '@mui/material';
import { AppBreadcrumbs, BreadcrumbProvider } from '@duncit/breadcrumb';
import { useTranslation } from '../i18n/useTranslation';
import { localizeNav, localizeSearchItems } from '../i18n/localize-nav';
import PortalPageTitle from './PortalPageTitle';
import type { AppNavItem, SearchItem } from '../types';
import { AppHeader } from './AppHeader';
import type { ShellTool } from './AppsDrawer/tools';
import { StaffChatPanel } from '../staff-chat';
import { STAFF_CHAT_ROLES } from '../staff-chat/roles';
import { AppShellNav } from './AppShellNav';
import { AgentLauncher } from './agent';
import { usePortalAppFeatures } from './usePortalAppFeatures';
import type { ShellUser } from './user-display';
import { Taskbar, WorkspaceProvider } from '../workspace';

const MAIN_ID = 'app-main';

/** The slice of a portal's `appConfig` the chrome needs — pass appConfig directly. */
export interface AppShellPortalConfig {
  name: string;
  fullName?: string;
  footerCaption?: string;
  /** Registry key — which row Admin > Portal App Settings configures. */
  key?: string;
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
  const { t } = useTranslation();
  // Resolved here so the sidebar, the header search, the breadcrumbs and the
  // page title all read the SAME labels — see localizeNav.
  const localizedNav = useMemo(() => localizeNav(nav, t), [nav, t]);
  const localizedSearch = useMemo(() => localizeSearchItems(searchItems, t), [searchItems, t]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobileNav = useCallback(() => setMobileOpen(false), []);
  // The chat is DOCKED, so its open state belongs to the layout rather than to
  // the button: the panel is a sibling of the main content, and opening it
  // narrows that content instead of covering it.
  const [chatOpen, setChatOpen] = useState(false);

  /*
    Stable identities, not inline arrows.

    The panel keys effects off these — restoring what was open, and showing
    itself when a call arrives. An arrow rebuilt on every render makes those
    effects run on every render, which turns "reopen it if it was open" into
    "reopen it, always", and the close button cannot win.
  */
  const openChat = useCallback(() => setChatOpen(true), []);
  const closeChat = useCallback(() => setChatOpen(false), []);
  const toggleChat = useCallback(() => setChatOpen((current) => !current), []);
  const features = usePortalAppFeatures(config.key);
  // Read ONCE. `roles` is nullable on the session and not on the chat panel's
  // prop, and narrowing it twice would be a second branch saying the same thing
  // — one nobody can reach, because `showChat` below already implies a
  // non-empty array by the time the panel is rendered.
  const roles = user?.roles ?? [];
  const isStaff = roles.some((role) => STAFF_CHAT_ROLES.has(role));
  // The panel is mounted whether or not it shows, so turning chat off has to
  // unmount it here too — otherwise the socket keeps ringing on a console that
  // no longer offers chat.
  const showChat = isStaff && features.chat;

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
    <WorkspaceProvider enabled={Boolean(user)}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100dvh',
          overflow: 'hidden',
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ display: 'flex', flex: 1, minWidth: 0, minHeight: 0 }}>
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
            {t('shell.chrome.skipToContent')}
          </Box>
          <AppShellNav
            name={config.name}
            footerCaption={config.footerCaption}
            nav={localizedNav}
            user={user}
            mobileOpen={mobileOpen}
            onCloseMobile={closeMobileNav}
          />
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <AppHeader
              title={config.fullName ?? config.name}
              name={config.name}
              nav={localizedNav}
              searchItems={localizedSearch}
              user={user}
              profileTo={profileTo}
              onLogout={onLogout}
              onOpenMobileNav={() => setMobileOpen(true)}
              tools={tools}
              chatOpen={chatOpen}
              onToggleChat={toggleChat}
              chatEnabled={features.chat}
              appsEnabled={features.apps}
            />
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
              <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <BreadcrumbProvider>
                  <PortalPageTitle
                    nav={localizedNav}
                    shortName={config.name}
                    appName={config.fullName ?? config.name}
                    labelMap={breadcrumbLabelMap}
                  />
                  <AppBreadcrumbs nav={localizedNav} appName={config.name} labelMap={breadcrumbLabelMap} />
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
              {showChat && (
                <StaffChatPanel
                  open={chatOpen}
                  meId={user?.user_id ?? ''}
                  meName={user?.full_name ?? user?.first_name ?? undefined}
                  // Optional on the panel, which defaults it to []. `showChat`
                  // already implies a matching `roles` array, so the fallback
                  // never applies — but asserting that with `!` tells the reader
                  // nothing the narrowing above did not already do.
                  meRoles={roles}
                  onClose={closeChat}
                  onRequestOpen={openChat}
                />
              )}
            </Box>
          </Box>
        </Box>

        {/* The taskbar is a ROW of this column, not a bar fixed over the page:
            the content above it is genuinely shorter, so the last line of a long
            table is readable instead of sitting underneath the clock. */}
        <Taskbar />

        {/* Every console gets the Agent. Its tab is fixed-positioned, so it sits
            outside the layout above and covers nothing until opened; what it will
            actually DO is decided by the caller's own roles, server-side. */}
        <AgentLauncher />
      </Box>
    </WorkspaceProvider>
  );
}
