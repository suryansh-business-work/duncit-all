import type { NavigatorScreenParams } from '@react-navigation/native';

import type { LeadKind } from '@/features/leads/leadKinds';

export type TabParamList = {
  Home: undefined;
  Leads: undefined;
  Dialer: { number?: string } | undefined;
  Reminders: undefined;
  Settings: undefined;
};

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  LeadDetail: { kind: LeadKind; id: string };
  AddNote: { kind: LeadKind; id: string; name: string };
  AddReminder: { kind?: LeadKind; id?: string; name?: string; title?: string };
  PostCall: undefined;
};
