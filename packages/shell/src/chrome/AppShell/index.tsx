import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Box } from '@mui/material';
import { Loader, useRouteFocus } from '@duncit/ui';
import { useTranslation } from '../../i18n/useTranslation';
import { localizeNav, localizeSearchItems } from '../../i18n/localize-nav';
import { AppHeader } from '../AppHeader';
import { StaffChatPanel } from '../../staff-chat';
import { STAFF_CHAT_ROLES } from '../../staff-chat/roles';
import { AppShellNav } from '../AppShellNav';
import { CONTENT_PANEL_SX } from '../shell-layout';
import { AgentLauncher } from '../agent';
import { usePortalAppFeatures } from '../usePortalAppFeatures';
import { Taskbar, WorkspaceProvider } from '../../workspace';
import { BackgroundJobsProvider } from '../../background-jobs';
import { AppShellMain, MAIN_ID } from './AppShellMain';
import { SkipLink } from './SkipLink';
import type { AppShellProps } from './types';

export type { AppShellPortalConfig, AppShellProps } from './types';

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
  const mainRef = useRef<HTMLElement>(null);
  useRouteFocus(mainRef);
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
    return <Loader variant="page" />;
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
      <BackgroundJobsProvider enabled={Boolean(user)}>
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
            <SkipLink targetId={MAIN_ID} label={t('shell.chrome.skipToContent')} />
            <AppShellNav
              name={config.name}
              footerCaption={config.footerCaption}
              nav={localizedNav}
              user={user}
              mobileOpen={mobileOpen}
              onCloseMobile={closeMobileNav}
            />
            <Box sx={CONTENT_PANEL_SX}>
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
                  <AppShellMain
                    nav={localizedNav}
                    shortName={config.name}
                    appName={config.fullName ?? config.name}
                    labelMap={breadcrumbLabelMap}
                    mainRef={mainRef}
                  >
                    {children}
                  </AppShellMain>
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
      </BackgroundJobsProvider>
    </WorkspaceProvider>
  );
}
