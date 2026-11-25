import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Spinner, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth.store';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { TwoFactorScreen } from '@/screens/auth/TwoFactorScreen';
import { SecurityVerificationScreen } from '@/screens/auth/SecurityVerificationScreen';
import { LeadDetailScreen } from '@/screens/lead/LeadDetailScreen';
import { AddNoteScreen } from '@/screens/lead/AddNoteScreen';
import { LeadEditorScreen } from '@/screens/lead/LeadEditorScreen';
import { AddReminderScreen } from '@/screens/reminders/AddReminderScreen';
import { PostCallScreen } from '@/screens/post-call/PostCallScreen';
import { CallScreen } from '@/screens/call/CallScreen';
import { MenuScreen } from '@/screens/menu/MenuScreen';
import { PortalPageScreen } from '@/screens/portal/PortalPageScreen';
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
import { screenLayout } from './screenLayout';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

/** Signed out → the sign-in steps; signed in → the app. The auth store decides which. */
export function RootNavigator() {
  const { t } = useTranslation();
  const chrome = useConsoleChrome();
  const status = useAuthStore((s) => s.status);

  if (status === 'loading') {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$background"
        aria-busy
      >
        <Spinner size="large" color="$accentText" />
      </YStack>
    );
  }
  if (status === 'signedOut') return <LoginScreen />;
  if (status === 'twoFactor') return <TwoFactorScreen />;
  if (status === 'security') return <SecurityVerificationScreen />;

  return (
    <Stack.Navigator screenLayout={screenLayout} screenOptions={chrome.stackHeader}>
      <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="LeadDetail"
        component={LeadDetailScreen}
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
        name="Menu"
        component={MenuScreen}
        options={{
          headerShown: false,
          presentation: 'transparentModal',
          animation: 'slide_from_left',
        }}
      />
      <Stack.Screen name="PortalPage" component={PortalPageScreen} options={{ title: '' }} />
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
      <Stack.Screen name="Candidate" component={CandidateScreen} options={{ title: '' }} />
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
        options={{ title: '' }}
      />
      <Stack.Screen
        name="UserLeadEditor"
        component={UserLeadEditorScreen}
        options={{ title: '' }}
      />
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
  );
}
