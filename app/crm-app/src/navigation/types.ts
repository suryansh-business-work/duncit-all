import type { NavigatorScreenParams } from '@react-navigation/native';

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
  /** No id = a new lead of this kind. */
  LeadEditor: { kind: LeadKind; id?: string };
  AddNote: { kind: LeadKind; id: string; name: string };
  AddReminder: { kind?: LeadKind; id?: string; name?: string; title?: string };
  PostCall: undefined;
  /** The side menu: the CRM portal's sidebar, every item. */
  Menu: undefined;
  /** A portal page the app does not have yet: what it is, and a way to open it in the portal. */
  PortalPage: { path: string; titleKey: string };
};
