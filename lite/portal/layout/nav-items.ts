import type { ComponentType } from 'react';
import type { SvgIconProps } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventIcon from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CategoryIcon from '@mui/icons-material/Category';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import EmailIcon from '@mui/icons-material/Email';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TranslateIcon from '@mui/icons-material/Translate';
import SettingsIcon from '@mui/icons-material/Settings';

export interface NavItem {
  /** Route path, also the stable React key. */
  path: string;
  /** Catalogue key under `litePortal.nav`. */
  labelKey: string;
  icon: ComponentType<SvgIconProps>;
  testId: string;
}

/** The sidebar, in the order an admin reads it. */
export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/', labelKey: 'litePortal.nav.dashboard', icon: DashboardIcon, testId: 'nav-dashboard' },
  { path: '/events', labelKey: 'litePortal.nav.events', icon: EventIcon, testId: 'nav-events' },
  { path: '/users', labelKey: 'litePortal.nav.users', icon: PeopleIcon, testId: 'nav-users' },
  { path: '/registrations', labelKey: 'litePortal.nav.registrations', icon: ConfirmationNumberIcon, testId: 'nav-registrations' },
  { path: '/calendars', labelKey: 'litePortal.nav.calendars', icon: CalendarMonthIcon, testId: 'nav-calendars' },
  { path: '/categories', labelKey: 'litePortal.nav.categories', icon: CategoryIcon, testId: 'nav-categories' },
  { path: '/cities', labelKey: 'litePortal.nav.cities', icon: LocationCityIcon, testId: 'nav-cities' },
  { path: '/environment', labelKey: 'litePortal.nav.environment', icon: VpnKeyIcon, testId: 'nav-environment' },
  { path: '/email-templates', labelKey: 'litePortal.nav.emailTemplates', icon: EmailIcon, testId: 'nav-email-templates' },
  { path: '/email-logs', labelKey: 'litePortal.nav.emailLogs', icon: ReceiptLongIcon, testId: 'nav-email-logs' },
  { path: '/localization', labelKey: 'litePortal.nav.localization', icon: TranslateIcon, testId: 'nav-localization' },
  { path: '/settings', labelKey: 'litePortal.nav.settings', icon: SettingsIcon, testId: 'nav-settings' },
];

export const DRAWER_WIDTH = 248;
