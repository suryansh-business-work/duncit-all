import type { ReactNode } from 'react';
import { navIcons } from './navIcons';

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
    items: [{ label: 'Dashboard', to: '/dashboard', icon: navIcons.dashboard }],
  },
  {
    heading: 'User Management',
    prefixes: ['/users', '/rbac'],
    items: [
      { label: 'All Users', to: '/users', icon: navIcons.people },
      { label: 'Roles', to: '/rbac/roles', icon: navIcons.security },
    ],
  },
  {
    heading: 'Catalog',
    prefixes: ['/categories', '/locations', '/sliders'],
    items: [
      { label: 'Categories', to: '/categories', icon: navIcons.accountTree },
      { label: 'Locations', to: '/locations', icon: navIcons.location },
      { label: 'Sliders', to: '/sliders', icon: navIcons.carousel },
    ],
  },
  {
    heading: 'Community',
    prefixes: ['/clubs', '/pods', '/pod-ideas', '/pod-plans', '/coupons', '/event-tickets'],
    items: [
      {
        label: 'Clubs',
        icon: navIcons.groups,
        matchPrefix: '/clubs',
        children: [
          { label: 'All Clubs', to: '/clubs', icon: navIcons.groups },
          { label: 'Pods', to: '/pods', icon: navIcons.event },
          { label: 'Pod Ideas', to: '/pod-ideas', icon: navIcons.lightbulb },
          { label: 'Pod Plans', to: '/pod-plans', icon: navIcons.category },
          { label: 'Coupons', to: '/coupons', icon: navIcons.percent },
          { label: 'Event Tickets', to: '/event-tickets', icon: navIcons.receipt },
        ],
      },
    ],
  },
  {
    heading: 'Engagement',
    prefixes: [
      '/interview-requests',
      '/faqs',
      '/email-templates',
      '/badges',
      '/support-logs',
    ],
    items: [
      { label: 'Interview Requests', to: '/interview-requests', icon: navIcons.eventAvailable },
      { label: 'FAQs', to: '/faqs', icon: navIcons.help },
      { label: 'Support Logs', to: '/support-logs', icon: navIcons.support },
      { label: 'Email Templates', to: '/email-templates', icon: navIcons.email },
      { label: 'Badges', to: '/badges', icon: navIcons.shield },
    ],
  },
  {
    heading: 'Partners',
    prefixes: ['/partners'],
    items: [
      { label: 'Partner FAQs', to: '/partners/faqs', icon: navIcons.partners },
    ],
  },
  {
    heading: 'System',
    prefixes: ['/branding', '/settings'],
    items: [
      { label: 'Branding', to: '/branding', icon: navIcons.branding },
      { label: 'Settings', to: '/settings', icon: navIcons.settings },
    ],
  },
];
