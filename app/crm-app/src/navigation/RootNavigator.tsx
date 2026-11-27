import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { useTranslation } from '@/hooks/useTranslation';
import { LeadDetailScreen } from '@/screens/lead/LeadDetailScreen';
import { AddNoteScreen } from '@/screens/lead/AddNoteScreen';
import { LeadEditorScreen } from '@/screens/lead/LeadEditorScreen';
import { AddReminderScreen } from '@/screens/reminders/AddReminderScreen';
import { PostCallScreen } from '@/screens/post-call/PostCallScreen';
import { CallScreen } from '@/screens/call/CallScreen';
import { ManagedOptionsScreen } from '@/screens/data/ManagedOptionsScreen';
import { CallPromptsScreen } from '@/screens/call-prompts/CallPromptsScreen';
import { CallPromptEditorScreen } from '@/screens/call-prompts/CallPromptEditorScreen';
import { ServicesOfferedScreen } from '@/screens/services-offered/ServicesOfferedScreen';
import { ServiceOfferedEditorScreen } from '@/screens/services-offered/ServiceOfferedEditorScreen';
import { LeadListScreen } from '@/screens/leads/LeadListScreen';
import { WhatsAppGeneratorScreen } from '@/screens/whatsapp-generator/WhatsAppGeneratorScreen';
import { EmailTemplatesScreen } from '@/screens/email-templates/EmailTemplatesScreen';
import { EmailTemplateCreateScreen } from '@/screens/email-templates/EmailTemplateCreateScreen';
import { EmailTemplateEditorScreen } from '@/screens/email-templates/EmailTemplateEditorScreen';
import { EmailTemplateSettingsScreen } from '@/screens/email-templates/EmailTemplateSettingsScreen';
import { LeadQualitySettingsScreen } from '@/screens/settings-lead-quality/LeadQualitySettingsScreen';
import { DynamicFieldsScreen } from '@/screens/dynamic-fields/DynamicFieldsScreen';
import { DynamicFieldEditorScreen } from '@/screens/dynamic-fields/DynamicFieldEditorScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { TwilioSetupScreen } from '@/screens/settings/TwilioSetupScreen';
import { DashboardScreen } from '@/screens/dashboard/DashboardScreen';
import { UserLeadsScreen } from '@/screens/user-leads/UserLeadsScreen';
import { EmailVerifierScreen } from '@/screens/email-verifier/EmailVerifierScreen';
import { QualityAnalyticsScreen } from '@/screens/quality-analytics/QualityAnalyticsScreen';
import { LeadResearchScreen } from '@/screens/lead-research/LeadResearchScreen';
import { CandidateScreen } from '@/screens/lead-research/CandidateScreen';
import { LeadDiscoveryScreen } from '@/screens/lead-research/LeadDiscoveryScreen';
import { UserLeadDetailScreen } from '@/screens/user-leads/UserLeadDetailScreen';
import { UserLeadEditorScreen } from '@/screens/user-leads/UserLeadEditorScreen';
import { useConsoleChrome } from './chrome';
import { MainTabs } from './MainTabs';
import { screenLayout, stackScreenLayout } from './screenLayout';
import { SignInGate } from './SignInGate';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

/** Signed out → the sign-in steps; signed in → the app. The auth store decides which. */
export function RootNavigator() {
  const { t } = useTranslation();
  const chrome = useConsoleChrome();
  return (
    <SignInGate>
      {/* White icons over the red app bar, in light and dark mode alike. */}
      <StatusBar style="light" />
      <Stack.Navigator screenLayout={stackScreenLayout} screenOptions={chrome.stackHeader}>
        {/* The tab bar already keeps clear of the system navigation bar. */}
        <Stack.Screen
          name="Tabs"
          component={MainTabs}
          layout={screenLayout}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LeadDetail"
          component={LeadDetailScreen}
          // A lead opening another lead (a duplicate, a reminder, a call) pushes a
          // new page: without an id the open one was reused, scroll and all.
          getId={({ params }) => `${params.kind}:${params.id}`}
          options={{ title: t('crmApp.lead.overview') }}
        />
        <Stack.Screen
          name="LeadEditor"
          component={LeadEditorScreen}
          options={{ title: t('crmApp.editor.editTitle') }}
        />
        <Stack.Screen
          name="AddNote"
          component={AddNoteScreen}
          options={{ title: t('crmApp.note.title') }}
        />
        <Stack.Screen
          name="AddReminder"
          component={AddReminderScreen}
          options={{ title: t('crmApp.reminder.title') }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: t('crmApp.tabs.settings') }}
        />
        <Stack.Screen
          name="TwilioSetup"
          component={TwilioSetupScreen}
          options={{ title: t('crmApp.twilio.title') }}
        />
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: t('shell.nav.dashboard') }}
        />
        <Stack.Screen
          name="UserLeads"
          component={UserLeadsScreen}
          options={{ title: t('shell.nav.whatsappLeads') }}
        />
        <Stack.Screen
          name="LeadResearch"
          component={LeadResearchScreen}
          options={{ title: t('shell.nav.leadResearch') }}
        />
        <Stack.Screen
          name="Candidate"
          component={CandidateScreen}
          getId={({ params }) => params.id}
          options={{ title: '' }}
        />
        <Stack.Screen
          name="LeadDiscovery"
          component={LeadDiscoveryScreen}
          options={{ title: t('crm.leadResearch.discoverTitle') }}
        />
        <Stack.Screen
          name="QualityAnalytics"
          component={QualityAnalyticsScreen}
          options={{ title: t('shell.nav.leadQualityAnalytics') }}
        />
        <Stack.Screen
          name="EmailVerifier"
          component={EmailVerifierScreen}
          options={{ title: t('shell.nav.emailVerifier') }}
        />
        <Stack.Screen
          name="UserLeadDetail"
          component={UserLeadDetailScreen}
          getId={({ params }) => params.id}
          options={{ title: '' }}
        />
        <Stack.Screen
          name="UserLeadEditor"
          component={UserLeadEditorScreen}
          options={{ title: '' }}
        />
        <Stack.Screen name="ManagedOptions" component={ManagedOptionsScreen} />
        <Stack.Screen name="CallPrompts" component={CallPromptsScreen} />
        <Stack.Screen name="CallPromptEditor" component={CallPromptEditorScreen} />
        <Stack.Screen name="ServicesOffered" component={ServicesOfferedScreen} />
        <Stack.Screen name="ServiceOfferedEditor" component={ServiceOfferedEditorScreen} />
        <Stack.Screen name="LeadList" component={LeadListScreen} />
        <Stack.Screen name="EmailTemplates" component={EmailTemplatesScreen} />
        <Stack.Screen name="EmailTemplateCreate" component={EmailTemplateCreateScreen} />
        <Stack.Screen name="EmailTemplateEditor" component={EmailTemplateEditorScreen} />
        <Stack.Screen name="EmailTemplateSettings" component={EmailTemplateSettingsScreen} />
        <Stack.Screen
          name="WhatsAppGenerator"
          component={WhatsAppGeneratorScreen}
          options={{ title: t('shell.nav.whatsappLeadGenerator') }}
        />
        <Stack.Screen
          name="LeadQualitySettings"
          component={LeadQualitySettingsScreen}
          options={{ title: t('crm.leadQualitySettings.title') }}
        />
        <Stack.Screen
          name="DynamicFields"
          component={DynamicFieldsScreen}
          options={{ title: t('shell.nav.dynamicFields') }}
        />
        <Stack.Screen name="DynamicFieldEditor" component={DynamicFieldEditorScreen} />
        <Stack.Screen
          name="Call"
          component={CallScreen}
          options={{ title: t('crmApp.call.screenTitle') }}
        />
        <Stack.Screen
          name="PostCall"
          component={PostCallScreen}
          options={{ title: t('crmApp.postCall.title') }}
        />
      </Stack.Navigator>
    </SignInGate>
  );
}
