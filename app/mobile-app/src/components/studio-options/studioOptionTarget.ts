import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';
import { partnerPortalUrl } from '@duncit/onboarding';
import type { StudioOptionIcon, StudioOptionItem } from '@duncit/utils';

import type { MenuStackRoute } from '@/navigation/types';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/** The catalogue's semantic icons, drawn with this app's own glyphs. */
export const STUDIO_OPTION_ICON: Readonly<Record<StudioOptionIcon, IconName>> = {
  dashboard: 'space-dashboard',
  venue: 'store',
  pods: 'event',
  create: 'add-circle-outline',
  autopods: 'auto-awesome',
  calendar: 'event-available',
  availability: 'event-repeat',
  settings: 'settings',
  earnings: 'insights',
  publish: 'public',
  change: 'swap-horiz',
  requests: 'move-to-inbox',
  nearby: 'travel-explore',
  verification: 'verified-user',
  wallet: 'account-balance-wallet',
  clubs: 'groups',
  monitoring: 'monitor-heart',
  brands: 'storefront',
  integrations: 'extension',
  returns: 'assignment-return',
};

/**
 * The shared catalogue is framework-free, so its native route is a plain
 * string; studioOptionTarget.test pins every one to a registered, deep-linked
 * screen — which is what makes this narrowing safe.
 */
export function studioRoute(route: string): MenuStackRoute {
  return route as MenuStackRoute;
}

export type StudioOptionTarget =
  { kind: 'route'; route: MenuStackRoute } | { kind: 'portal'; url: string };

/** Where an option goes in the app: its own screen, or — for an option the app
 * has no screen for (a brand's catalogue, say) — the Partner console. */
export function studioOptionTarget(
  item: Pick<StudioOptionItem, 'route' | 'portal'>,
): StudioOptionTarget {
  if (item.route) return { kind: 'route', route: studioRoute(item.route) };
  return { kind: 'portal', url: partnerPortalUrl(item.portal) };
}
