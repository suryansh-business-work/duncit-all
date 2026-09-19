import type { NestedCatalogue } from '@duncit/i18n';

/** The web app's copy (luma.duncit.com). Every string a visitor reads lives here, namespaced by page. */
export const LITE_WEB_BUNDLE: NestedCatalogue = {
  liteWeb: {
    nav: {
      label: 'Site navigation',
      discover: 'Discover',
      tickets: 'My tickets',
      hosting: 'Hosting',
      calendars: 'Calendars',
      create: 'Create event',
      profile: 'Profile',
      home: '{name} home',
    },
    footer: {
      tagline: 'Simple event pages, hosted on Duncit.',
      support: 'Support',
    },
  },
};
