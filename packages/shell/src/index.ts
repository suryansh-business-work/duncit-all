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
export type { MountPortalOptions, PortalBootConfig, AppNavItem, SearchItem } from './types';
export { useColorMode } from '@duncit/theme';

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
export { UserMenu, type UserMenuProps } from './chrome/UserMenu';
export { ProfilePage } from './chrome/ProfilePage';
export { AuthSplitLayout, type AuthSplitLayoutProps } from './chrome/AuthSplitLayout';
export type { ShellUser } from './chrome/user-display';

// Shared helpers the portals previously carried as identical copies.
export { useBranding, type BrandingSummary } from './hooks/useBranding';
export { createSession, SUPER_ROLE, type PortalSession } from './lib/session';

// Test-only provider so portal tests that used local ColorModeContext shims keep working.
export { ColorModeProvider, type ColorModeProviderProps } from './test/ColorModeProvider';
