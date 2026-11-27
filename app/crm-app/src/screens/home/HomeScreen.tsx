import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { formatDate } from '@duncit/datetime';
import { fireAndForget, logs } from '@duncit/logs';

import { Card } from '@/components/Card';
import { DuncitButton } from '@/components/DuncitButton';
import { EmptyState } from '@/components/mobile/EmptyState';
import { QuickAction } from '@/components/mobile/QuickAction';
import { StateView } from '@/components/StateView';
import { SURFACE } from '@/components/surface';
import { MOBILE } from '@/constants/design';
import { CrmAppRemindersDocument } from '@/graphql/reminders';
import { todayWindow } from '@/features/reminders/reminderTime';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { usePhoneSetup } from '@/hooks/usePhoneSetup';
import { useScrollTopOnTabEntry } from '@/hooks/useScrollTopOnTabEntry';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/stores/auth.store';
import { ReminderRow } from '@/screens/reminders/ReminderRow';

const SCOPE = 'crm-app/HomeScreen';

/**
 * Today at a glance: the day's quick actions under the thumb (dialer, find a
 * lead, a follow-up, the dashboard), what is due today, and a nudge until the
 * phone's call features are set up. Pull down to refresh.
 */
export function HomeScreen() {
  const { t } = useTranslation();
  const scrollRef = useScrollTopOnTabEntry<ScrollView>();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const name = useAuthStore((s) => s.user?.first_name ?? '');
  const filter = useMemo(() => ({ filter: { ...todayWindow(), status: 'PENDING' as const } }), []);
  const reminders = useGqlQuery(CrmAppRemindersDocument, filter, {
    fallbackError: t('crmApp.common.loadFailed'),
    skip: true,
  });
  const { refetch } = reminders;
  const [pulling, setPulling] = useState(false);
  useFocusEffect(
    useCallback(() => {
      fireAndForget(refetch(), logs.mobileApp, SCOPE, 'refetch');
    }, [refetch]),
  );
  const phone = usePhoneSetup();

  const pull = () => {
    setPulling(true);
    fireAndForget(
      refetch().finally(() => setPulling(false)),
      logs.mobileApp,
      SCOPE,
      'pull',
    );
  };
  const due = reminders.data?.crmReminders ?? [];
  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={{ padding: MOBILE.gutter, gap: 16 }}
      refreshControl={
        <RefreshControl refreshing={pulling} onRefresh={pull} tintColor={theme.accentText?.val} />
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
      <YStack gap="$2">
        <XStack alignItems="center" gap="$2" paddingHorizontal="$1">
          <Text flex={1} fontWeight="700" fontSize="$6" role="heading">
            {t('crmApp.home.dueToday')}
          </Text>
          {due.length > 0 ? (
            <Text color="$muted" fontWeight="600" testID="home-due-count">
              {due.length}
            </Text>
          ) : null}
        </XStack>
        <StateView
          loading={!reminders.data && !reminders.error}
          error={reminders.error}
          onRetry={reminders.refetch}
          rows={2}
        />
        {reminders.data && due.length === 0 ? (
          <YStack {...SURFACE}>
            <EmptyState icon="event-available" title={t('crmApp.home.nothingDue')} />
          </YStack>
        ) : null}
        {due.map((r) => (
          <ReminderRow key={r.id} reminder={r} onChanged={reminders.refetch} />
        ))}
      </YStack>
    </ScrollView>
  );
}
