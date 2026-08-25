/**
 * @duncit/shell — the shared Duncit console Shell.
 *
 * `mountPortal(opts)` bootstraps the common provider stack (Apollo, user/session,
 * theme + color mode, MUI localization, Google OAuth, router, portal-mode gating,
 * log shipping). Each portal supplies only its route tree + a few config values.
 * The light/dark `useColorMode` hook is re-exported so portals read it from one
 * place instead of a local color-mode context.
 *
 * The chrome (AppShell header/sidebar/breadcrumbs, HeaderSearch, AuthSplitLayout)
 * also lives here now — portals wrap their authed routes in `<AppShell>` and pass
 * their existing `appConfig` values instead of carrying local copies.
 */
export { mountPortal } from './mountPortal';
export { PortalBranding } from './PortalBranding';
export type { MountPortalOptions, PortalBootConfig, AppConfig, AppModule, AppNavItem, SearchItem } from './types';
export { useColorMode, type AccentColors } from '@duncit/theme';

// Unified chrome.
export { AppShell, type AppShellProps, type AppShellPortalConfig } from './chrome/AppShell';
export { AppHeader, type AppHeaderProps } from './chrome/AppHeader';
export { HeaderSearch, deriveSearchItems, type HeaderSearchProps } from './chrome/HeaderSearch';
export { AppSidebar, type AppSidebarProps } from './chrome/AppSidebar';
export { SidebarUserCard, type SidebarUserCardProps } from './chrome/AppSidebar/SidebarUserCard';
export {
  AppBreadcrumbs,
  BreadcrumbProvider,
  useSetBreadcrumbs,
  type AppBreadcrumbsProps,
  type BreadcrumbNavItem,
  type Crumb,
} from '@duncit/breadcrumb';
export { AppIcon } from './chrome/AppIcon';
// The apps drawer behind the header's nine dots, and the file manager it opens.
export { AppsDrawer, useShellTools, type ShellTool } from './chrome/AppsDrawer';
export { FileManagerDialog } from './file-manager';
export { StaffChatPanel } from './staff-chat';
export { StaffChatButton } from './staff-chat/StaffChatButton';
// The console taskbar and the per-user desk behind it. AppShell mounts both;
// these are exported so a portal that lays out its own chrome, and the tests,
// can reach the same registry rather than starting a second one.
export {
  ABOVE_TASKBAR_HEIGHT,
  Taskbar,
  WorkspaceProvider,
  describeZone,
  deviceTimeZone,
  formatGmtOffset,
  supportedTimeZones,
  useWorkspace,
  useWorkspaceWindow,
  withSeconds,
  zoneChoices,
  type AgentDock,
  type DockEdge,
  type WorkspaceProviderProps,
  type WorkspaceWindow,
  type WorkspaceWindowHandle,
  type ZoneChoice,
} from './workspace';
export { ShellRuntimeProvider, useShellRuntime, type ShellRuntime } from './lib/runtime';
export { UserMenu, type UserMenuProps } from './chrome/UserMenu';
export { ProfilePage } from './chrome/ProfilePage';
export { AuthSplitLayout, type AuthSplitLayoutProps } from './chrome/AuthSplitLayout';
export type { ShellUser } from './chrome/user-display';

// Shared helpers the portals previously carried as identical copies.
export { useBranding, type BrandingSummary } from './hooks/useBranding';
export { createSession, SUPER_ROLE, type PortalSession } from './lib/session';
export { createApolloClient, apolloErrorLink, type CreateApolloClientOptions } from './lib/apollo';
export { getSafeRedirectPath, redirectPathFromLocation, type RedirectLocation } from './lib/redirect';
export { parseEnvRoles } from './lib/env-roles';
// The Google OAuth client id the server resolves from the Tech portal env store.
export { getGoogleClientId, setGoogleClientId, loadGoogleClientId } from './lib/google-client-id';

// Auth route guard + `authed()` route-table helper (previously in every App.tsx).
export { RequireAuth, createAuthed, type RequireAuthProps, type CreateAuthedOptions } from './auth/RequireAuth';

// The login page every console previously hand-rolled (wraps user-context's LoginScreen).
export { PortalLoginPage } from './portal-login';
export type { PortalLoginAppConfig, PortalLoginPageProps, PortalLoginSession } from './portal-login';

// The shared welcome dashboard + "Your account" card (previously 5 identical portal copies).
export { AccountSummaryCard, type AccountSummaryUser } from './dashboard/AccountSummaryCard';
export { WelcomeDashboard, type WelcomeDashboardProps } from './dashboard/WelcomeDashboard';

// Test-only provider so portal tests that used local ColorModeContext shims keep working.
export { ColorModeProvider, type ColorModeProviderProps } from './test/ColorModeProvider';
export { ProfileLanguage } from './chrome/ProfileLanguage';
export { fallbackT, SHELL_FALLBACK, SHELL_FALLBACK_FLAT, type Translate } from './i18n/fallback';
// Portals translate through the shell's wrapper so the bundled fallback is
// always supplied — a portal importing @duncit/app-settings directly would have
// to repeat that argument at every call site.
export { useTranslation } from './i18n/useTranslation';
// Re-exported so a detail page can name the tab after what it is showing (a
// ticket's subject, a user's name) without reaching past the shell. The shell
// already titles every routed page from the breadcrumb; this is the override.
export { usePageMeta, type PageMetaInput } from '@duncit/app-settings';
