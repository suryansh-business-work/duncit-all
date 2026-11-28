import { Linking } from 'react-native';
import type { LinkingOptions } from '@react-navigation/native';

import type { AppStackParamList } from './types';

/**
 * Every way into the app from outside it:
 *  - duncitcrm://lead/<KIND>/<id>  the caller ID card and its notification
 *  - duncitcrm://dialer            the widget, the home-screen Dialer icon, the shortcut
 *  - duncitcrm://leads, /reminders the widget and the long-press shortcuts
 *  - duncitcrm://post-call         the "call ended" notification
 *  - tel:<number>                  any phone number tapped anywhere, when Duncit CRM is picked to dial it
 */
export const PREFIX = 'duncitcrm://';

/** A tel: link becomes the dialer with the number filled in; anything else passes through. */
export function fromTelLink(url: string | null): string | null {
  if (!url?.toLowerCase().startsWith('tel:')) return url;
  const number = decodeURIComponent(url.slice(4)).replace(/[^\d+*#]/g, '');
  return `${PREFIX}dialer?number=${encodeURIComponent(number)}`;
}

export const linking: LinkingOptions<AppStackParamList> = {
  prefixes: [PREFIX],
  config: {
    screens: {
      Tabs: {
        screens: {
          Home: 'home',
          Leads: 'leads',
          Dialer: 'dialer',
          Reminders: 'reminders',
          More: 'more',
        },
      },
      // Settings left the tab bar for More; its old link still opens it.
      Settings: 'settings',
      LeadDetail: 'lead/:kind/:id',
      PostCall: 'post-call',
    },
  },
  async getInitialURL() {
    return fromTelLink(await Linking.getInitialURL());
  },
  subscribe(listener) {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const mapped = fromTelLink(url);
      if (mapped) listener(mapped);
    });
    return () => subscription.remove();
  },
};
