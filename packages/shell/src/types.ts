import type { ReactNode } from 'react';
import type { ApolloClient } from '@apollo/client';
import type { AccentColors, ComponentExtend } from '@duncit/theme';
import type { UserProviderProps } from '@duncit/user-context';

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
  /** The `logs.portal.<x>` sink that `captureConsole` forwards console output to. */
  logsPortal: Parameters<(typeof import('@duncit/logs'))['captureConsole']>[0];
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
