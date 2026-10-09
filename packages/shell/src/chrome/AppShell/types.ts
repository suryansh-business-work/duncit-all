import type { ReactNode } from 'react';
import type { AppNavItem, SearchItem } from '../../types';
import type { ShellTool } from '../AppsDrawer/tools';
import type { ShellUser } from '../user-display';

/** The slice of a portal's `appConfig` the chrome needs — pass appConfig directly. */
export interface AppShellPortalConfig {
  name: string;
  fullName?: string;
  footerCaption?: string;
  /** Registry key — which row Admin > Portal App Settings configures. */
  key?: string;
}

export interface AppShellProps {
  config: AppShellPortalConfig;
  nav: AppNavItem[];
  /** Header-wide search entries; derived from `nav` when omitted. */
  searchItems?: SearchItem[];
  user?: ShellUser;
  onLogout: () => void;
  /** Route of the profile page; omit to hide the Profile menu item. */
  profileTo?: string;
  /** Portal-computed role gate; `false` (with a loaded user) redirects to /login?denied=1. */
  hasAccess?: boolean;
  /** User still loading — shows the boot spinner until the user arrives. */
  loading?: boolean;
  /** Called before the denied redirect (e.g. clear the auth token). */
  onDenied?: () => void;
  /** Route-segment → label overrides for the breadcrumbs. */
  breadcrumbLabelMap?: Record<string, string>;
  /** Extra entries for the header's apps drawer, beside the platform's own. */
  tools?: ShellTool[];
  /** Change logs also show who-by email and roles, surface, address and browser (the Finance console). */
  detailedChangeLogs?: boolean;
  /** Rendered under the sidebar's branding, above the menu (e.g. the Partner
   * console's studio switcher). Hidden while the sidebar is the icon rail. */
  sidebarHeader?: ReactNode;
  children: ReactNode;
}
