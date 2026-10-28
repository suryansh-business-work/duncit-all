import { TAB_PARAM } from '@duncit/tabs';

/** Opens a page on one of its tabs, under the key DuncitTabs reads the selection from. */
const tabQuery = (tab?: string): string => (tab ? `?${TAB_PARAM}=${encodeURIComponent(tab)}` : '');

/** Every route the web app links to, in one place. */
export const paths = {
  home: '/',
  /** Your events: hosting and attending, upcoming and past. */
  events: '/home',
  discover: '/discover',
  pricing: '/pricing',
  legal: (slug: string) => `/legal/${slug}`,
  search: (q: string) => `/search?q=${encodeURIComponent(q)}`,
  city: (slug: string) => `/${slug}`,
  category: (slug: string) => `/category/${slug}`,
  event: (slug: string) => `/e/${slug}`,
  eventEdit: (slug: string) => `/e/${slug}/edit`,
  eventManage: (slug: string, tab?: string) => `/e/${slug}/manage${tabQuery(tab)}`,
  /** The door scanner a host opens on their phone to check guests in. */
  eventScan: (slug: string) => `/e/${slug}/scan`,
  create: '/create',
  tickets: '/tickets',
  ticket: (id: string) => `/tickets/${id}`,
  hosting: '/hosting',
  calendars: '/calendars',
  calendarNew: '/calendars/new',
  calendarEdit: (id: string) => `/calendars/${id}/edit`,
  calendar: (slug: string) => `/cal/${slug}`,
  user: (handle: string) => `/u/${handle}`,
  profile: '/profile',
  settings: (tab?: string) => `/settings${tabQuery(tab)}`,
  signIn: '/signin',
  ics: {
    event: (slug: string) => `/ics/event/${slug}.ics`,
    calendar: (slug: string) => `/ics/cal/${slug}.ics`,
  },
} as const;
