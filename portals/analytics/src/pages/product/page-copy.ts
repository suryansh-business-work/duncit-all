/** Each Product page's heading, subtitle and standing note — written out literally for the localization gate. */
export interface PageCopy {
  title: string;
  subtitle: string;
  note: string;
}

export const PAGE_COPY = {
  screens: {
    title: 'analytics.product.screens.title',
    subtitle: 'analytics.product.screens.subtitle',
    note: 'analytics.product.screens.note',
  },
  clickstream: {
    title: 'analytics.product.clickstream.title',
    subtitle: 'analytics.product.clickstream.subtitle',
    note: 'analytics.product.clickstream.note',
  },
  funnels: {
    title: 'analytics.product.funnels.title',
    subtitle: 'analytics.product.funnels.subtitle',
    note: 'analytics.product.funnels.note',
  },
  retention: {
    title: 'analytics.product.retention.title',
    subtitle: 'analytics.product.retention.subtitle',
    note: 'analytics.product.retention.note',
  },
  sessions: {
    title: 'analytics.product.sessions.title',
    subtitle: 'analytics.product.sessions.subtitle',
    note: 'analytics.product.sessions.note',
  },
  users: {
    title: 'analytics.product.users.title',
    subtitle: 'analytics.product.users.subtitle',
    note: 'analytics.product.users.note',
  },
  events: {
    title: 'analytics.product.events.title',
    subtitle: 'analytics.product.events.subtitle',
    note: 'analytics.product.events.note',
  },
} satisfies Record<string, PageCopy>;
