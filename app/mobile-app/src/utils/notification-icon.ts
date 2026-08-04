import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';
import { notificationCategory, type NotificationCategory } from '@duncit/utils';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

/** The classification itself is shared with mWeb (@duncit/utils); only the
 * MaterialIcons map below is native-specific and therefore stays here. */
export { notificationCategory, type NotificationCategory };

/** MaterialIcons glyph per category (native app + native web). */
const ICON_BY_CATEGORY: Record<NotificationCategory, MaterialIconName> = {
  review: 'star',
  meeting: 'event',
  approval: 'check-circle',
  request: 'markunread-mailbox',
  achievement: 'celebration',
  support: 'chat',
  payment: 'payment',
  club: 'account-balance',
  pod: 'mic',
  account: 'person',
  general: 'notifications-active',
};

/** Contextual MaterialIcons glyph name for a notification's title. */
export function notificationIconName(title: string | null | undefined): MaterialIconName {
  return ICON_BY_CATEGORY[notificationCategory(title)];
}
