import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/**
 * The bottom-tab destinations, mirroring mWeb's BottomNav.
 *
 * Chats and Following used to be the last two and are now tiles in the account
 * menu; the bar carries the two places a visitor GOES instead — spaces to meet,
 * and the basket they are carrying.
 */
export type TabParamList = {
  HomeTab: undefined;
  Explore: undefined;
  Clubs: undefined;
  Venues: undefined;
  Cart: undefined;
};

export interface TabConfig {
  name: keyof TabParamList;
  label: string;
  /** Localization key for the visible label (mweb.nav.*, shared with mWeb). */
  labelKey: string;
  icon: IconName;
}

/** Route → label/icon config, shared by the tab navigator and the custom tab bar. */
export const TAB_CONFIG: TabConfig[] = [
  { name: 'HomeTab', label: 'Home', labelKey: 'mweb.nav.home', icon: 'home' },
  { name: 'Explore', label: 'Explore', labelKey: 'mweb.nav.explore', icon: 'explore' },
  { name: 'Clubs', label: 'Clubs', labelKey: 'mweb.nav.clubs', icon: 'groups' },
  { name: 'Venues', label: 'Venues', labelKey: 'mweb.nav.venues', icon: 'store' },
  { name: 'Cart', label: 'Cart', labelKey: 'mweb.nav.cart', icon: 'shopping-cart' },
];

const TAB_ROUTE_NAMES: ReadonlySet<string> = new Set(TAB_CONFIG.map((tab) => tab.name));

/**
 * Does this destination live in the tab navigator?
 *
 * A navigation action bubbles UP to parents and never down into a child
 * navigator, so a pushed screen or the account menu cannot reach `Cart` by name
 * — it has to ask for `Home` and name the tab inside it. This is how a caller
 * outside the tabs tells which destinations need that.
 */
export function isTabRoute(name: string): name is keyof TabParamList {
  return TAB_ROUTE_NAMES.has(name);
}
