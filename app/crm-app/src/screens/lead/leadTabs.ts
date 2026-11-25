import type { ComponentType } from 'react';
import type { Translator } from '@duncit/i18n';

import type { LeadKind } from '@/features/leads/leadKinds';
import type { Lead } from '@/features/leads/useLead';
import { LeadReminders } from './LeadReminders';
import { AskAiTab } from './tabs/AskAiTab';
import { CommsTab } from './tabs/CommsTab';
import { LeadCommercialTab } from './tabs/LeadCommercialTab';
import { LeadContactsTab } from './tabs/LeadContactsTab';
import { LeadCustomFieldsTab } from './tabs/LeadCustomFieldsTab';
import { LeadLinkedHostsTab } from './tabs/LeadLinkedHostsTab';
import { LeadPlansTab } from './tabs/LeadPlansTab';
import { LeadQualityTab } from './tabs/LeadQualityTab';
import { LeadServicesTab } from './tabs/LeadServicesTab';
import { LeadSocialTab } from './tabs/LeadSocialTab';
import { ManualLogsTab } from './tabs/ManualLogsTab';
import { MediaTab } from './tabs/MediaTab';
import { SurveyTab } from './tabs/SurveyTab';
import { WebsitePagesTab } from './tabs/WebsitePagesTab';
import type { LeadTabProps } from './tabs/parts/tabTypes';

/** Every tab a lead page can have; Overview is drawn by the page itself. */
export type LeadPaneKey =
  | 'quality'
  | 'contacts'
  | 'commercial'
  | 'plans'
  | 'social'
  | 'services'
  | 'media'
  | 'survey'
  | 'website'
  | 'reminders'
  | 'linked-hosts'
  | 'custom-fields'
  | 'manual-logs'
  | 'communications'
  | 'ask-ai';
export type LeadTabKey = 'overview' | LeadPaneKey;

const PROSPECT_TABS: readonly LeadTabKey[] = [
  'overview',
  'quality',
  'contacts',
  'social',
  'services',
  'media',
  'custom-fields',
  'reminders',
  'manual-logs',
  'communications',
  'ask-ai',
];

/** Each kind's tabs, in the order of its page in the CRM portal (Ask AI is the portal's side drawer). */
const LEAD_TABS: Record<LeadKind, readonly LeadTabKey[]> = {
  VENUE_LEAD: [
    'overview',
    'quality',
    'contacts',
    'commercial',
    'social',
    'services',
    'media',
    'survey',
    'website',
    'reminders',
    'linked-hosts',
    'custom-fields',
    'manual-logs',
    'communications',
    'ask-ai',
  ],
  HOST_LEAD: [
    'overview',
    'quality',
    'contacts',
    'plans',
    'social',
    'services',
    'media',
    'survey',
    'website',
    'reminders',
    'custom-fields',
    'manual-logs',
    'communications',
    'ask-ai',
  ],
  ECOMM_LEAD: [
    'overview',
    'quality',
    'contacts',
    'services',
    'media',
    'custom-fields',
    'reminders',
    'manual-logs',
    'communications',
    'ask-ai',
  ],
  CREATOR_LEAD: PROSPECT_TABS,
  COMMUNITY_LEAD: PROSPECT_TABS,
};

export const leadTabsFor = (kind: LeadKind): readonly LeadTabKey[] => LEAD_TABS[kind];

type Translate = Translator['t'];

/** The portal's tab labels (literal keys, so the localization gate sees them). */
const LABELS: Record<LeadTabKey, (t: Translate, lead: Lead) => string> = {
  overview: (t) => t('crm.common.overview'),
  quality: (t) => t('crm.leadQualityTab.title'),
  contacts: (t, lead) => t('crm.prospectLeads.contactsCount', { count: lead.contacts.length }),
  commercial: (t) => t('crm.venueLeads.commercial'),
  plans: (t) => t('crm.hostLeads.plansAndTimeline2'),
  social: (t) => t('crm.common.social'),
  services: (t) => t('crm.common.services'),
  media: (t) => t('crm.media.tabLabel'),
  survey: (t) => t('crm.common.survey'),
  website: (t) => t('crm.common.website'),
  reminders: (t) => t('shell.nav.reminders'),
  'linked-hosts': (t) => t('crm.venueLeads.linkedHosts'),
  'custom-fields': (t) => t('crm.common.customFields2'),
  'manual-logs': (t) => t('crm.common.manualLogs'),
  communications: (t) => t('crm.common.communications'),
  'ask-ai': (t) => t('crm.components.askAi'),
};

export const leadTabLabel = (key: LeadTabKey, t: Translate, lead: Lead): string =>
  LABELS[key](t, lead);

const PANES: Record<LeadPaneKey, ComponentType<LeadTabProps>> = {
  quality: LeadQualityTab,
  contacts: LeadContactsTab,
  commercial: LeadCommercialTab,
  plans: LeadPlansTab,
  social: LeadSocialTab,
  services: LeadServicesTab,
  media: MediaTab,
  survey: SurveyTab,
  website: WebsitePagesTab,
  reminders: LeadReminders,
  'linked-hosts': LeadLinkedHostsTab,
  'custom-fields': LeadCustomFieldsTab,
  'manual-logs': ManualLogsTab,
  communications: CommsTab,
  'ask-ai': AskAiTab,
};

/** The tab's content for a key this kind has, or null for Overview / a key it does not have. */
export function leadPaneFor(kind: LeadKind, key: string): ComponentType<LeadTabProps> | null {
  const tab = LEAD_TABS[kind].find((k) => k === key);
  return tab && tab !== 'overview' ? PANES[tab] : null;
}
