import type { ComponentType } from 'react';
import type { SvgIconProps } from '@mui/material';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import { paths } from '../../lib/paths';

export interface NavItem {
  to: string;
  labelKey: string;
  icon: ComponentType<SvgIconProps>;
  /** Other paths that light this entry up. */
  match: (pathname: string) => boolean;
  /** Only shown to a signed-in reader. */
  signedIn?: boolean;
}

const DISCOVER_PREFIXES = ['/discover', '/category/', '/search'] as const;
const EVENTS_PREFIXES = ['/home', '/hosting', '/tickets', '/create'] as const;
/** An event's host pages count as "your events". */
const HOST_SUFFIXES = ['/manage', '/edit', '/scan'] as const;

const isEventsPath = (p: string): boolean =>
  EVENTS_PREFIXES.some((prefix) => p.startsWith(prefix)) || (p.startsWith('/e/') && HOST_SUFFIXES.some((suffix) => p.endsWith(suffix)));

/** The site's places: your events, calendars, Discover and Pricing. */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: paths.events, labelKey: 'liteWeb.nav.events', icon: ConfirmationNumberOutlinedIcon, match: isEventsPath, signedIn: true },
  { to: paths.calendars, labelKey: 'liteWeb.nav.calendars', icon: CalendarMonthOutlinedIcon, match: (p) => p.startsWith('/calendars'), signedIn: true },
  { to: paths.discover, labelKey: 'liteWeb.nav.discover', icon: ExploreOutlinedIcon, match: (p) => DISCOVER_PREFIXES.some((prefix) => p.startsWith(prefix)) },
  { to: paths.pricing, labelKey: 'liteWeb.nav.pricing', icon: SellOutlinedIcon, match: (p) => p.startsWith('/pricing') },
];

/** The places a reader sees: the signed-in ones only once signed in. */
export const visibleNavItems = (signedIn: boolean): readonly NavItem[] => NAV_ITEMS.filter((item) => signedIn || !item.signedIn);
