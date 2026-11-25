import type { NavigatorScreenParams } from '@react-navigation/native';

import type { ManagedOptionGroup } from '@/features/data/useManagedOptions';
import type { EmailSettingsTab } from '@/screens/email-templates/routes';
import type { EditableService } from '@/features/services-offered/serviceOffered';
import type { LeadKind } from '@/features/leads/leadKinds';

export type TabParamList = {
  Home: undefined;
  /** The portal's per-kind lead pages open the list on one kind. */
  Leads: { kind?: LeadKind } | undefined;
  Dialer: { number?: string } | undefined;
  Reminders: undefined;
  Settings: undefined;
};

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  LeadDetail: { kind: LeadKind; id: string };
  /** One kind's full listing (the portal's Venue / Host / … Leads page). */
  LeadList: { kind: LeadKind };
  /** No id = a new lead of this kind. */
  LeadEditor: { kind: LeadKind; id?: string };
  AddNote: { kind: LeadKind; id: string; name: string };
  AddReminder: { kind?: LeadKind; id?: string; name?: string; title?: string };
  PostCall: undefined;
  /**
   * A call on the CRM call line, as the portal's call window runs it: Twilio
   * rings this phone, joins the contact in, records and transcribes.
   */
  Call: { kind: LeadKind; id: string; to: string; leadName: string; contactName?: string };
  /** The side menu: the CRM portal's sidebar, every item. */
  Menu: undefined;
  /** The portal's Dashboard: KPIs and charts for venue and host leads. */
  Dashboard: undefined;
  /** CRM › User Leads › WhatsApp Leads, one lead, and adding or editing one. */
  UserLeads: undefined;
  UserLeadDetail: { id: string };
  UserLeadEditor: { id?: string };
  /** CRM › Tools › Email Verifier. */
  EmailVerifier: undefined;
  /** CRM › Leads › Quality Analytics. */
  QualityAnalytics: undefined;
  /** CRM › Leads › Lead Research, one candidate, and Discover leads. */
  LeadResearch: undefined;
  Candidate: { id: string };
  LeadDiscovery: undefined;
  /** CRM › AI Call Prompts › Static Content, and adding or editing one prompt. */
  CallPrompts: undefined;
  CallPromptEditor: { id?: string };
  /** CRM › Data › Services Offered, and adding (no service) or editing one. */
  ServicesOffered: undefined;
  ServiceOfferedEditor: { service?: EditableService };
  /** CRM › Data › Venues › Amenities or Event Suitability. */
  ManagedOptions: { group: ManagedOptionGroup };
  /** CRM › Email Templates: the list, a new template, one template's editor, and Settings. */
  EmailTemplates: undefined;
  EmailTemplateCreate: undefined;
  EmailTemplateEditor: { id: string };
  EmailTemplateSettings: { tab?: EmailSettingsTab } | undefined;
  /** CRM › Tools › WhatsApp Lead Generator. */
  WhatsAppGenerator: undefined;
  /** CRM › Settings › Lead Quality Score, opened on one lead type or the first. */
  LeadQualitySettings: { leadType?: LeadKind } | undefined;
  /** CRM › Settings › Dynamic Fields, and adding (no id) or editing one field. */
  DynamicFields: undefined;
  DynamicFieldEditor: { id?: string };
};
