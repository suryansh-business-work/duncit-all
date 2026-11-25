import type { NavigationProp } from '@react-navigation/native';

import { isLeadKind } from '@/features/leads/leadKinds';
import { CRM_NAV, findNavKey, type NavItem } from '@/navigation/crmNav';
import type { AppStackParamList } from '@/navigation/types';

/** The bits of a navigation route the menu reads (react-navigation's own shape). */
export interface RouteLike {
  name: string;
  params?: object;
  state?: { index?: number; routes: RouteLike[] };
}

const param = (route: RouteLike, key: string): unknown =>
  (route.params as Record<string, unknown> | undefined)?.[key];

/**
 * Which menu item the screen under the menu belongs to: a portal page by its
 * path, the Leads tab by its kind, the Reminders tab — or none (Home, Dialer…).
 */
export function activeNavKey(route: RouteLike | undefined): string | null {
  if (!route) return null;
  if (route.name === 'PortalPage') {
    const path = param(route, 'path');
    return findNavKey(CRM_NAV, (t) => t.type === 'portal' && t.path === path);
  }
  // A page the app has: its own screen (Dashboard, User Leads…).
  const own = findNavKey(CRM_NAV, (t) => t.type === 'screen' && t.screen === route.name);
  if (own) return own;
  if (route.name !== 'Tabs') return null;
  const tabs = route.state;
  const tab = tabs?.routes[tabs.index ?? 0];
  if (!tab) return null;
  if (tab.name === 'Leads') {
    const kind = param(tab, 'kind');
    return isLeadKind(kind)
      ? findNavKey(CRM_NAV, (t) => t.type === 'leads' && t.kind === kind)
      : null;
  }
  return findNavKey(CRM_NAV, (t) => t.type === 'tab' && t.tab === tab.name);
}

/** Close the menu and open where the item points. */
export function goTo(navigation: NavigationProp<AppStackParamList>, item: NavItem): void {
  const target = item.target;
  if (!target) return;
  navigation.goBack();
  if (target.type === 'screen') navigation.navigate(target.screen);
  else if (target.type === 'tab') navigation.navigate('Tabs', { screen: target.tab });
  else if (target.type === 'leads')
    navigation.navigate('Tabs', { screen: 'Leads', params: { kind: target.kind } });
  else navigation.navigate('PortalPage', { path: target.path, titleKey: item.labelKey });
}
