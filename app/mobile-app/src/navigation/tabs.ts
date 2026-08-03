import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/** The five bottom-tab destinations, mirroring mWeb's BottomNav. */
export type TabParamList = {
  HomeTab: undefined;
  Explore: undefined;
  Clubs: undefined;
  Chats: undefined;
  Following: undefined;
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
  { name: 'Chats', label: 'Chats', labelKey: 'mweb.nav.chats', icon: 'chat-bubble-outline' },
  {
    name: 'Following',
    label: 'Following',
    labelKey: 'mweb.nav.following',
    icon: 'favorite-border',
  },
];
