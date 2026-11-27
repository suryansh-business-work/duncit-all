import type { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import type { ManagedOptionGroup } from '@/features/data/useManagedOptions';
import type { LeadKind } from '@/features/leads/leadKinds';

/** An icon from the Material set, or the community set for brand marks (WhatsApp). */
export type NavIcon =
  | { set: 'material'; name: keyof typeof MaterialIcons.glyphMap }
  | { set: 'community'; name: keyof typeof MaterialCommunityIcons.glyphMap };

/**
 * Where a menu item goes in the app:
 *  - tab: one of the bottom tabs;
 *  - leads: the Leads tab, filtered to one kind (the portal's per-kind lead pages);
 *  - options: one of the managed lists (Amenities, Event Suitability);
 */
export type NavTarget =
  | { type: 'tab'; tab: 'Home' | 'Reminders' }
  | {
      type: 'screen';
      screen:
        | 'Dashboard'
        | 'UserLeads'
        | 'EmailVerifier'
        | 'QualityAnalytics'
        | 'LeadResearch'
        | 'CallPrompts'
        | 'ServicesOffered'
        | 'LeadQualitySettings'
        | 'DynamicFields'
        | 'WhatsAppGenerator'
        | 'EmailTemplates'
        | 'EmailTemplateSettings';
    }
  | { type: 'leads'; kind: LeadKind }
  | { type: 'options'; group: ManagedOptionGroup };

export interface NavItem {
  key: string;
  /** The portal's own sidebar label key (shell.nav.*), so both read the same. */
  labelKey: string;
  icon: NavIcon;
  target?: NavTarget;
  children?: NavItem[];
}

const m = (name: keyof typeof MaterialIcons.glyphMap): NavIcon => ({ set: 'material', name });
const WHATSAPP: NavIcon = { set: 'community', name: 'whatsapp' };
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
            target: { type: 'screen', screen: 'LeadQualitySettings' },
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
        target: { type: 'screen', screen: 'WhatsAppGenerator' },
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
        target: { type: 'screen', screen: 'ServicesOffered' },
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
            target: { type: 'options', group: 'AMENITY' },
          },
          {
            key: 'eventSuitability',
            labelKey: 'shell.nav.eventSuitabilityManagement',
            icon: m('analytics'),
            target: { type: 'options', group: 'EVENT_SUITABILITY' },
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
        target: { type: 'screen', screen: 'EmailTemplates' },
      },
      {
        key: 'emailTemplateSettings',
        labelKey: 'shell.nav.emailTemplateSettings',
        icon: m('settings'),
        target: { type: 'screen', screen: 'EmailTemplateSettings' },
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
        target: { type: 'screen', screen: 'CallPrompts' },
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
        target: { type: 'screen', screen: 'DynamicFields' },
      },
    ],
  },
];

/** One group of the More tab: the portal sidebar group's label and every page inside it. */
export interface MoreSection {
  key: string;
  /** No label for the pages that sit at the sidebar's top level (Dashboard). */
  labelKey?: string;
  items: NavItem[];
}

const pagesIn = (item: NavItem): NavItem[] =>
  item.children ? item.children.flatMap(pagesIn) : [item];

/**
 * The sidebar as the More tab lists it: each portal group becomes a titled
 * section of its pages (nested groups flattened, in order), the top-level pages
 * share one untitled section first, and pages a bottom tab already holds
 * (Reminders) are left out — the tab bar is where they live on the phone.
 */
export function moreSections(items: readonly NavItem[]): MoreSection[] {
  const notATab = (page: NavItem) => page.target?.type !== 'tab';
  const top = items.filter((item) => !item.children && notATab(item));
  const groups = items
    .filter((item) => item.children)
    .map((group) => ({
      key: group.key,
      labelKey: group.labelKey,
      items: pagesIn(group).filter(notATab),
    }));
  return [...(top.length > 0 ? [{ key: 'top', items: top }] : []), ...groups].filter(
    (section) => section.items.length > 0,
  );
}
