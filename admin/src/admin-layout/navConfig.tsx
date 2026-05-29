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
      {
        label: 'Users',
        icon: navIcons.group,
        matchPrefix: '/users',
        children: [{ label: 'All Users', to: '/users', icon: navIcons.people }],
      },
      {
        label: 'Access Control',
        icon: navIcons.adminPanel,
        matchPrefix: '/rbac',
        children: [
          { label: 'Roles', to: '/rbac/roles', icon: navIcons.security },
          { label: 'Permissions', to: '/rbac/permissions', icon: navIcons.vpnKey },
          { label: 'Resources', to: '/rbac/resources', icon: navIcons.category },
          { label: 'Actions', to: '/rbac/actions', icon: navIcons.bolt },
        ],
      },
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
    heading: 'Inventory Management',
    prefixes: ['/inventory', '/ecomm'],
    items: [
      { label: 'Inventory', to: '/inventory', icon: navIcons.inventory },
      { label: 'Ecomm Requests', to: '/ecomm/product-requests', icon: navIcons.inventory },
    ],
  },
  {
    heading: 'Community',
    prefixes: ['/clubs', '/pods', '/pod-ideas', '/pod-plans'],
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
    heading: 'Onboarding',
    prefixes: ['/venues', '/hosts'],
    items: [
      { label: 'Hosts', to: '/hosts', icon: navIcons.people },
      { label: 'Registered Venues', to: '/venues', icon: navIcons.storefront },
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
    prefixes: ['/feature-flags', '/branding', '/settings'],
    items: [
      { label: 'Feature Flags', to: '/feature-flags', icon: navIcons.flag },
      { label: 'Branding', to: '/branding', icon: navIcons.branding },
      { label: 'Settings', to: '/settings', icon: navIcons.settings },
    ],
  },
];
