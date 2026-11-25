import type { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import type { LeadKind } from '@/features/leads/leadKinds';

/** An icon from the Material set, or the community set for brand marks (WhatsApp). */
export type NavIcon =
  | { set: 'material'; name: keyof typeof MaterialIcons.glyphMap }
  | { set: 'community'; name: keyof typeof MaterialCommunityIcons.glyphMap };

/**
 * Where a menu item goes in the app:
 *  - tab: one of the bottom tabs;
 *  - leads: the Leads tab, filtered to one kind (the portal's per-kind lead pages);
 *  - portal: a CRM portal page the app does not have yet — its screen says so and
 *    opens that page in the portal (path is the portal's own route).
 */
export type NavTarget =
  | { type: 'tab'; tab: 'Home' | 'Reminders' }
  | {
      type: 'screen';
      screen: 'Dashboard' | 'UserLeads' | 'EmailVerifier' | 'QualityAnalytics' | 'LeadResearch';
    }
  | { type: 'leads'; kind: LeadKind }
  | { type: 'portal'; path: string };

export interface NavItem {
  key: string;
  /** The portal's own sidebar label key (shell.nav.*), so both read the same. */
  labelKey: string;
  icon: NavIcon;
  target?: NavTarget;
  children?: NavItem[];
  /** Kept at the foot of the menu, as the portal pins it to the sidebar's bottom. */
  pinBottom?: boolean;
}

const m = (name: keyof typeof MaterialIcons.glyphMap): NavIcon => ({ set: 'material', name });
const WHATSAPP: NavIcon = { set: 'community', name: 'whatsapp' };
const portal = (path: string): NavTarget => ({ type: 'portal', path });
const leads = (kind: LeadKind): NavTarget => ({ type: 'leads', kind });

/**
 * The CRM portal's sidebar (portals/crm/src/config/app-config.ts `nav`), item
 * for item and in its order — the same groups, labels and icons — so a person
 * moving between the portal and the app finds everything in the same place.
 * A change to the portal's sidebar must be made here too (CLAUDE.md parity rule).
 */
export const CRM_NAV: readonly NavItem[] = [
  {
    key: 'dashboard',
    labelKey: 'shell.nav.dashboard',
    icon: m('dashboard'),
    target: { type: 'screen', screen: 'Dashboard' },
  },
  {
    key: 'leads',
    labelKey: 'shell.nav.leads',
    icon: m('groups'),
    children: [
      {
        key: 'venueLeads',
        labelKey: 'shell.nav.venueLeads',
        icon: m('my-location'),
        target: leads('VENUE_LEAD'),
      },
      {
        key: 'hostLeads',
        labelKey: 'shell.nav.hostLeads',
        icon: m('groups'),
        target: leads('HOST_LEAD'),
      },
      {
        key: 'ecommLeads',
        labelKey: 'shell.nav.ecommLeads',
        icon: m('inventory-2'),
        target: leads('ECOMM_LEAD'),
      },
      {
        key: 'creatorLeads',
        labelKey: 'shell.nav.creatorLeads',
        icon: m('campaign'),
        target: leads('CREATOR_LEAD'),
      },
      {
        key: 'communityLeads',
        labelKey: 'shell.nav.communityLeads',
        icon: m('groups'),
        target: leads('COMMUNITY_LEAD'),
      },
      {
        key: 'leadResearch',
        labelKey: 'shell.nav.leadResearch',
        icon: m('person-search'),
        target: { type: 'screen', screen: 'LeadResearch' },
      },
      {
        key: 'leadQualityAnalytics',
        labelKey: 'shell.nav.leadQualityAnalytics',
        icon: m('insights'),
        target: { type: 'screen', screen: 'QualityAnalytics' },
      },
      {
        key: 'leadsSettings',
        labelKey: 'shell.nav.leadsSettings',
        icon: m('settings'),
        children: [
          {
            key: 'leadQualityScore',
            labelKey: 'shell.nav.leadQualityScore',
            icon: m('tune'),
            target: portal('/settings/lead-quality'),
          },
        ],
      },
      {
        key: 'userLeads',
        labelKey: 'shell.nav.userLeads',
        icon: m('person-search'),
        children: [
          {
            key: 'whatsappLeads',
            labelKey: 'shell.nav.whatsappLeads',
            icon: WHATSAPP,
            target: { type: 'screen', screen: 'UserLeads' },
          },
        ],
      },
    ],
  },
  {
    key: 'tools',
    labelKey: 'shell.nav.tools',
    icon: m('handyman'),
    children: [
      {
        key: 'whatsappLeadGenerator',
        labelKey: 'shell.nav.whatsappLeadGenerator',
        icon: WHATSAPP,
        target: portal('/tools/whatsapp'),
      },
      {
        key: 'emailVerifier',
        labelKey: 'shell.nav.emailVerifier',
        icon: m('mark-email-read'),
        target: { type: 'screen', screen: 'EmailVerifier' },
      },
    ],
  },
  {
    key: 'reminders',
    labelKey: 'shell.nav.reminders',
    icon: m('calendar-month'),
    target: { type: 'tab', tab: 'Reminders' },
  },
  {
    key: 'data',
    labelKey: 'shell.nav.data',
    icon: m('analytics'),
    children: [
      {
        key: 'servicesOffered',
        labelKey: 'shell.nav.servicesOffered',
        icon: m('contacts'),
        target: portal('/data/services-offered'),
      },
      {
        key: 'venues',
        labelKey: 'shell.nav.venues',
        icon: m('my-location'),
        children: [
          {
            key: 'amenities',
            labelKey: 'shell.nav.amenitiesManagement',
            icon: m('analytics'),
            target: portal('/data/venues/amenities'),
          },
          {
            key: 'eventSuitability',
            labelKey: 'shell.nav.eventSuitabilityManagement',
            icon: m('analytics'),
            target: portal('/data/venues/event-suitability'),
          },
        ],
      },
    ],
  },
  {
    key: 'emailTemplates',
    labelKey: 'shell.nav.emailTemplates',
    icon: m('email'),
    children: [
      {
        key: 'templates',
        labelKey: 'shell.nav.templates',
        icon: m('email'),
        target: portal('/email-templates'),
      },
      {
        key: 'emailTemplateSettings',
        labelKey: 'shell.nav.emailTemplateSettings',
        icon: m('settings'),
        target: portal('/email-templates/settings'),
      },
    ],
  },
  {
    key: 'aiCallPrompts',
    labelKey: 'shell.nav.aiCallPrompts',
    icon: m('smart-toy'),
    children: [
      {
        key: 'staticContent',
        labelKey: 'shell.nav.staticContent',
        icon: m('phone-in-talk'),
        target: portal('/call-prompts'),
      },
    ],
  },
  {
    key: 'settings',
    labelKey: 'shell.nav.settings',
    icon: m('analytics'),
    children: [
      {
        key: 'dynamicFields',
        labelKey: 'shell.nav.dynamicFields',
        icon: m('analytics'),
        target: portal('/settings/dynamic-fields'),
      },
    ],
  },
  {
    key: 'crmMobileApp',
    labelKey: 'shell.nav.crmMobileApp',
    icon: m('android'),
    pinBottom: true,
    children: [
      {
        key: 'downloadCrmApp',
        labelKey: 'shell.nav.downloadCrmApp',
        icon: m('android'),
        target: portal('/download-app'),
      },
      {
        key: 'crmAppSettings',
        labelKey: 'shell.nav.settings',
        icon: m('settings'),
        target: portal('/download-app/settings'),
      },
    ],
  },
];

/** The key of the item a target belongs to, for the menu's "you are here" mark. */
export function findNavKey(
  items: readonly NavItem[],
  match: (target: NavTarget) => boolean,
): string | null {
  for (const item of items) {
    if (item.target && match(item.target)) return item.key;
    const inside = item.children ? findNavKey(item.children, match) : null;
    if (inside) return inside;
  }
  return null;
}

/** The keys of the groups on the way to an item, so the menu opens with them expanded. */
export function navPath(
  items: readonly NavItem[],
  key: string,
  trail: string[] = [],
): string[] | null {
  for (const item of items) {
    if (item.key === key) return trail;
    const inside = item.children ? navPath(item.children, key, [...trail, item.key]) : null;
    if (inside) return inside;
  }
  return null;
}
