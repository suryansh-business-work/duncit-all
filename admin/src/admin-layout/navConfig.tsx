import type { ReactNode } from 'react';
import PeopleIcon from '@mui/icons-material/People';
import GroupIcon from '@mui/icons-material/Group';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CategoryIcon from '@mui/icons-material/Category';
import BoltIcon from '@mui/icons-material/Bolt';
import FlagIcon from '@mui/icons-material/Flag';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GroupsIcon from '@mui/icons-material/Groups';
import EventIcon from '@mui/icons-material/Event';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import BrandingWatermarkIcon from '@mui/icons-material/BrandingWatermark';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PercentIcon from '@mui/icons-material/Percent';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import DescriptionIcon from '@mui/icons-material/Description';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ShieldIcon from '@mui/icons-material/Shield';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import Inventory2Icon from '@mui/icons-material/Inventory2';

export interface NavLeaf {
  label: string;
  to: string;
  icon: ReactNode;
}

export interface NavGroup {
  label: string;
  icon: ReactNode;
  matchPrefix?: string;
  children: NavLeaf[];
}

export interface NavSection {
  heading?: string;
  /** URL-prefix list — section is "active" when current path starts with one of these */
  prefixes?: string[];
  items: (NavLeaf | NavGroup)[];
}

export function isNavGroup(i: NavLeaf | NavGroup): i is NavGroup {
  return (i as NavGroup).children !== undefined;
}

export const NAV: NavSection[] = [
  {
    heading: 'Dashboard',
    prefixes: ['/dashboard'],
    items: [{ label: 'Dashboard', to: '/dashboard', icon: <DashboardIcon /> }],
  },
  {
    heading: 'User Management',
    prefixes: ['/users', '/rbac'],
    items: [
      {
        label: 'Users',
        icon: <GroupIcon />,
        matchPrefix: '/users',
        children: [{ label: 'All Users', to: '/users', icon: <PeopleIcon /> }],
      },
      {
        label: 'Access Control',
        icon: <AdminPanelSettingsIcon />,
        matchPrefix: '/rbac',
        children: [
          { label: 'Roles', to: '/rbac/roles', icon: <SecurityIcon /> },
          { label: 'Permissions', to: '/rbac/permissions', icon: <VpnKeyIcon /> },
          { label: 'Resources', to: '/rbac/resources', icon: <CategoryIcon /> },
          { label: 'Actions', to: '/rbac/actions', icon: <BoltIcon /> },
        ],
      },
    ],
  },
  {
    heading: 'Catalog',
    prefixes: ['/categories', '/locations', '/sliders', '/inventory'],
    items: [
      { label: 'Categories', to: '/categories', icon: <AccountTreeIcon /> },
      { label: 'Locations', to: '/locations', icon: <LocationOnIcon /> },
      { label: 'Inventory', to: '/inventory', icon: <Inventory2Icon /> },
      { label: 'Sliders', to: '/sliders', icon: <ViewCarouselIcon /> },
    ],
  },
  {
    heading: 'Community',
    prefixes: ['/clubs', '/pods', '/pod-ideas', '/pod-plans'],
    items: [
      {
        label: 'Clubs',
        icon: <GroupsIcon />,
        matchPrefix: '/clubs',
        children: [
          { label: 'All Clubs', to: '/clubs', icon: <GroupsIcon /> },
          { label: 'Pods', to: '/pods', icon: <EventIcon /> },
          { label: 'Pod Ideas', to: '/pod-ideas', icon: <LightbulbIcon /> },
          { label: 'Pod Plans', to: '/pod-plans', icon: <CategoryIcon /> },
        ],
      },
    ],
  },
  {
    heading: 'Engagement',
    prefixes: [
      '/notifications',
      '/interview-requests',
      '/faqs',
      '/policies',
      '/email-templates',
      '/badges',
      '/support-logs',
    ],
    items: [
      { label: 'Notifications', to: '/notifications', icon: <NotificationsActiveIcon /> },
      { label: 'Interview Requests', to: '/interview-requests', icon: <EventAvailableIcon /> },
      { label: 'FAQs', to: '/faqs', icon: <HelpOutlineIcon /> },
      { label: 'Support Logs', to: '/support-logs', icon: <SupportAgentIcon /> },
      { label: 'Policies', to: '/policies', icon: <DescriptionIcon /> },
      { label: 'Email Templates', to: '/email-templates', icon: <MarkEmailReadIcon /> },
      { label: 'Badges', to: '/badges', icon: <ShieldIcon /> },
    ],
  },
  {
    heading: 'Website',
    prefixes: ['/newsletter', '/contact-submissions', '/faq-submissions'],
    items: [
      { label: 'Newsletter', to: '/newsletter', icon: <MarkEmailReadIcon /> },
      { label: 'Contact Submissions', to: '/contact-submissions', icon: <MarkEmailReadIcon /> },
      { label: 'FAQ Submissions', to: '/faq-submissions', icon: <HelpOutlineIcon /> },
    ],
  },
  {
    heading: 'Onboarding',
    prefixes: ['/venues', '/hosts'],
    items: [
      { label: 'Hosts', to: '/hosts', icon: <PeopleIcon /> },
      { label: 'Registered Venues', to: '/venues', icon: <StorefrontIcon /> },
    ],
  },
  {
    heading: 'Finance',
    prefixes: ['/finance'],
    items: [
      {
        label: 'Finance',
        icon: <AccountBalanceIcon />,
        matchPrefix: '/finance',
        children: [
          { label: 'Dashboard', to: '/finance/dashboard', icon: <DashboardCustomizeIcon /> },
          { label: 'Settings', to: '/finance/settings', icon: <SettingsIcon /> },
          { label: 'Payment Logs', to: '/finance/payment-logs', icon: <ReceiptLongIcon /> },
          { label: 'Platform Fees', to: '/finance/platform-fees', icon: <PercentIcon /> },
          { label: 'GST Management', to: '/finance/gst', icon: <RequestQuoteIcon /> },
          { label: 'Invoices', to: '/finance/invoices', icon: <DescriptionIcon /> },
          { label: 'Ledger', to: '/finance/ledger', icon: <MenuBookIcon /> },
          { label: 'Venue Finance', to: '/finance/venue', icon: <StorefrontIcon /> },
          { label: 'Insurance', to: '/finance/insurance', icon: <ShieldIcon /> },
          { label: 'Payout Cycles', to: '/finance/payouts', icon: <CalendarMonthIcon /> },
        ],
      },
    ],
  },
  {
    heading: 'System',
    prefixes: ['/feature-flags', '/branding', '/settings'],
    items: [
      { label: 'Feature Flags', to: '/feature-flags', icon: <FlagIcon /> },
      { label: 'Branding', to: '/branding', icon: <BrandingWatermarkIcon /> },
      { label: 'Settings', to: '/settings', icon: <SettingsIcon /> },
    ],
  },
];
