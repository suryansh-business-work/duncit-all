import type { ComponentType } from 'react';
import type { SvgIconProps } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import EventIcon from '@mui/icons-material/Event';
import PublicIcon from '@mui/icons-material/Public';
import UpcomingIcon from '@mui/icons-material/Upcoming';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EmailIcon from '@mui/icons-material/Email';
import type { LiteAdminStats } from '../../graphql/admin';

export interface StatTile {
  key: keyof LiteAdminStats;
  labelKey: string;
  /** The page the tile opens. */
  to: string;
  icon: ComponentType<SvgIconProps>;
  /** Rupees rather than a count. */
  money?: boolean;
}

/** The nine tiles, in the order `liteAdminStats` answers them. */
export const STAT_TILES: readonly StatTile[] = [
  { key: 'users', labelKey: 'litePortal.dashboard.users', to: '/users', icon: PeopleIcon },
  { key: 'events', labelKey: 'litePortal.dashboard.events', to: '/events', icon: EventIcon },
  { key: 'published_events', labelKey: 'litePortal.dashboard.publishedEvents', to: '/events', icon: PublicIcon },
  { key: 'upcoming_events', labelKey: 'litePortal.dashboard.upcomingEvents', to: '/events', icon: UpcomingIcon },
  { key: 'registrations', labelKey: 'litePortal.dashboard.registrations', to: '/registrations', icon: ConfirmationNumberIcon },
  { key: 'confirmed_registrations', labelKey: 'litePortal.dashboard.confirmedRegistrations', to: '/registrations', icon: CheckCircleIcon },
  { key: 'revenue_confirmed', labelKey: 'litePortal.dashboard.revenue', to: '/registrations', icon: CurrencyRupeeIcon, money: true },
  { key: 'calendars', labelKey: 'litePortal.dashboard.calendars', to: '/calendars', icon: CalendarMonthIcon },
  { key: 'emails_sent_7d', labelKey: 'litePortal.dashboard.emailsSent7d', to: '/email-logs', icon: EmailIcon },
];

/** The sidebar entries the dashboard repeats as quick links. */
export const QUICK_LINK_PATHS: ReadonlySet<string> = new Set(['/events', '/users', '/registrations', '/email-logs', '/settings']);
