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
  icon: IconName;
}

/** Route → label/icon config, shared by the tab navigator and the custom tab bar. */
export const TAB_CONFIG: TabConfig[] = [
  { name: 'HomeTab', label: 'Home', icon: 'home' },
  { name: 'Explore', label: 'Explore', icon: 'explore' },
  { name: 'Clubs', label: 'Clubs', icon: 'groups' },
  { name: 'Chats', label: 'Chats', icon: 'chat-bubble-outline' },
  { name: 'Following', label: 'Following', icon: 'favorite-border' },
];
