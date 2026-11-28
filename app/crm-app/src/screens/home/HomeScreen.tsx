import { RefreshControl, ScrollView } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { formatDate } from '@duncit/datetime';
import { fireAndForget, logs } from '@duncit/logs';

import { Card } from '@/components/Card';
import { DuncitButton } from '@/components/DuncitButton';
import { QuickAction } from '@/components/mobile/QuickAction';
import { SURFACE } from '@/components/surface';
import { MOBILE } from '@/constants/design';
import { useRemindersCalendar } from '@/features/reminders/useRemindersCalendar';
import { usePhoneSetup } from '@/hooks/usePhoneSetup';
import { useScrollTopOnTabEntry } from '@/hooks/useScrollTopOnTabEntry';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/stores/auth.store';
import { HomeCalendar } from './HomeCalendar';

const SCOPE = 'crm-app/HomeScreen';

/**
 * The day at a glance: quick actions under the thumb (dialer, find a lead, a
 * follow-up, the dashboard), a nudge until the phone's call features are set
 * up, and the calendar — today, this week or this month of pending reminders
 * and lead follow-ups. Pull down to refresh.
 */
export function HomeScreen() {
  const { t } = useTranslation();
  const scrollRef = useScrollTopOnTabEntry<ScrollView>();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const name = useAuthStore((s) => s.user?.first_name ?? '');
  const calendar = useRemindersCalendar(t, { view: 'day', status: 'PENDING' });
  const phone = usePhoneSetup();

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={{ padding: MOBILE.gutter, gap: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={calendar.loading && calendar.loaded}
          onRefresh={calendar.refresh}
          tintColor={theme.accentText?.val}
        />
      }
    >
      <YStack gap="$1">
        <Text fontSize="$8" fontWeight="800" role="heading">
          {t('crmApp.home.greeting', { vars: { name } })}
        </Text>
        <Text color="$muted">{formatDate(new Date())}</Text>
      </YStack>
      <XStack {...SURFACE} padding="$2" testID="home-actions">
        <QuickAction
          icon={{ name: 'dialpad' }}
          label={t('crmApp.tabs.dialer')}
          onPress={() => navigation.navigate('Tabs', { screen: 'Dialer' })}
          testID="home-dialer"
        />
        <QuickAction
          icon={{ name: 'person-search' }}
          label={t('crmApp.mobile.findLead')}
          onPress={() => navigation.navigate('Tabs', { screen: 'Leads' })}
          testID="home-leads"
        />
        <QuickAction
          icon={{ name: 'alarm-add' }}
          label={t('crmApp.mobile.followUp')}
          onPress={() => navigation.navigate('AddReminder', {})}
          testID="home-add-reminder"
        />
        <QuickAction
          icon={{ name: 'insights' }}
          label={t('shell.nav.dashboard')}
          onPress={() => navigation.navigate('Dashboard')}
          testID="home-dashboard"
        />
      </XStack>
      {phone.ready ? null : (
        <Card title={t('crmApp.home.setupTitle')} testID="home-setup">
          <Text color="$muted">{t('crmApp.home.setupBody')}</Text>
          <DuncitButton
            label={t('crmApp.home.setupAction')}
            onPress={() => fireAndForget(phone.setUp(), logs.mobileApp, SCOPE, 'setUp')}
            testID="home-set-up"
          />
        </Card>
      )}
      <HomeCalendar calendar={calendar} />
    </ScrollView>
  );
}
