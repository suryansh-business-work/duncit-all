import { paths } from '../../lib/paths';

export interface NavItem {
  to: string;
  labelKey: string;
  /** Other paths that light this entry up. */
  match: (pathname: string) => boolean;
  /** Only shown to a signed-in reader. */
  signedIn?: boolean;
}

const DISCOVER_PREFIXES = ['/discover', '/category/', '/search', '/e/', '/cal/'] as const;

/** The site's four places, in the header on desktop and the bottom bar on a phone. */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    to: paths.discover,
    labelKey: 'liteWeb.nav.discover',
    match: (p) => p === '/' || DISCOVER_PREFIXES.some((prefix) => p.startsWith(prefix)),
  },
  { to: paths.tickets, labelKey: 'liteWeb.nav.tickets', match: (p) => p.startsWith('/tickets') },
  { to: paths.hosting, labelKey: 'liteWeb.nav.hosting', match: (p) => p.startsWith('/hosting') || p.endsWith('/manage') || p === '/create' },
  { to: paths.calendars, labelKey: 'liteWeb.nav.calendars', match: (p) => p.startsWith('/calendars') },
];
