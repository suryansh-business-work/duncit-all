import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';
import type { LaunchIconKey, LaunchRoleDefinition } from '@duncit/utils';

export type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

/** The page's pictograms, named in @duncit/utils and drawn here with MaterialIcons.
 * `Record` so a pictogram added to the list without an icon fails tsc. */
export const LAUNCH_ICONS: Record<LaunchIconKey, MaterialIconName> = {
  coffee: 'local-cafe',
  people: 'people',
  event: 'event',
  cheers: 'celebration',
  groups: 'groups',
  shield: 'verified-user',
  place: 'place',
  calendar: 'calendar-today',
  sparkle: 'auto-awesome',
  heart: 'favorite-border',
  chart: 'bar-chart',
  leaf: 'spa',
};

/** The pictogram in each role's badge. */
export const LAUNCH_BADGE_ICONS: Record<LaunchRoleDefinition['section'], MaterialIconName> = {
  host: 'groups',
  venue: 'storefront',
  club_admin: 'workspace-premium',
};
