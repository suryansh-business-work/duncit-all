import type { ReactNode } from 'react';
import type { ApolloClient } from '@apollo/client';
import type { AccentColors, ComponentExtend } from '@duncit/theme';
import type { UserProviderProps } from '@duncit/user-context';

/** A sidebar navigation entry. Items with `children` render as a collapsible group. */
export interface AppNavItem {
  label: string;
  /** Route the item links to. Optional when the item is purely a group header. */
  to?: string;
  icon?: string;
  /** Optional nested children — rendered as a collapsible group. */
  children?: AppNavItem[];
}

/** One entry of the header-wide global search. */
export interface SearchItem {
  label: string;
  to: string;
  keywords?: string[];
  section?: string;
}

/** A "Coming soon" module card on the portal welcome dashboard. */
export interface AppModule {
  title: string;
  description: string;
  icon: string;
}

/**
 * Superset of the per-portal `AppConfig` interfaces the 17 `app-config.ts`
 * files re-declared. Extends `PortalBootConfig`, so an `appConfig` typed with
 * this feeds `mountPortal`/`createSession` directly.
 */
export interface AppConfig extends PortalBootConfig {
  fullName: string;
  tagline: string;
  promoTitle: string;
  promoText: string;
  portalLabel: string;
  loginImage: string;
  requiredRoles: string[];
  nav: AppNavItem[];
  /** Welcome-dashboard "Coming soon" cards (portals with a `WelcomeDashboard`). */
  modules?: AppModule[];
}

/** Portal-specific values the shared Shell needs to boot the provider tree. */
export interface PortalBootConfig {
  /** Stable portal key, e.g. `crm`. Drives the user-cache storage key + PortalModeGate. */
  key: string;
  /** Human portal name, e.g. `CRM` — shown by PortalModeGate. */
  name: string;
  /** localStorage key holding the auth token (decides `isAuthed`). */
  tokenKey: string;
  /** localStorage key for the persisted light/dark color mode. */
  colorModeKey: string;
  /** Brand accent passed to the shared theme; omit to use the Duncit default. */
  accent?: AccentColors;
  /** Human console title, e.g. `Duncit CRM` — the chrome's header brand link. */
  fullName?: string;
  /** Sidebar navigation tree rendered by the shared chrome. */
  nav?: AppNavItem[];
  /** Header-wide search entries; derived from `nav` when omitted. */
  searchItems?: SearchItem[];
  /** Roles granting access to this console (SUPER_ADMIN always passes). */
  requiredRoles?: string[];
  /** Sidebar footer caption (defaults to `© Duncit`). */
  footerCaption?: string;
}

/** Everything `mountPortal` needs. Only the route tree + a handful of portal
 *  values differ between consoles — the rest of the provider stack is shared. */
export interface MountPortalOptions {
  config: PortalBootConfig;
  /** The portal's configured Apollo client. */
  apolloClient: ApolloClient<unknown>;
  /** Server GraphQL URL — also used to derive the `/logs` ingest + PortalModeGate. */
  graphqlUrl: string;
  /** Google OAuth client id (blank disables Google sign-in). */
  googleClientId?: string;
  /** The portal's `logs.portal.<x>` sink. Structured logging is now done at the
   * file level (`logs.portal.<x>.error(...)`), so this is no longer wired into a
   * global console capture — kept for back-compat with the portal main.tsx calls. */
  logsPortal?: import('@duncit/logs').LevelFns;
  /** Fetch the signed-in user (network-only ME query). */
  loadUser: UserProviderProps['loadUser'];
  /** Override the user-cache localStorage key (defaults to `<config.key>_user`). */
  userStorageKey?: string;
  /** The portal's route tree (its `<App />`). */
  children: ReactNode;
  /** Optional per-portal MUI override needing its own dep (e.g. CRM's MuiDataGrid). */
  themeExtend?: ComponentExtend;
  /** Wrap the routed content with extra providers (e.g. admin's ConfirmProvider). */
  wrap?: (node: ReactNode) => ReactNode;
  /** Extra router-level siblings (e.g. admin's NotifyHost). */
  extras?: ReactNode;
  /** Mount element id (default `root`). */
  rootId?: string;
}
