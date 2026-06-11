/**
 * @duncit/shell — the shared Duncit console Shell.
 *
 * `mountPortal(opts)` bootstraps the common provider stack (Apollo, user/session,
 * theme + color mode, MUI localization, Google OAuth, router, portal-mode gating,
 * log shipping). Each portal supplies only its route tree + a few config values.
 * The light/dark `useColorMode` hook is re-exported so portals read it from one
 * place instead of a local color-mode context.
 */
export { mountPortal } from './mountPortal';
export type { MountPortalOptions, PortalBootConfig } from './types';
export { useColorMode } from '@duncit/theme';
