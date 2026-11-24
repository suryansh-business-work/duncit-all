import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';
import { Text, XStack, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { Card } from '@/components/Card';
import { DuncitButton } from '@/components/DuncitButton';
import { StateView } from '@/components/StateView';
import { CrmAppRemindersDocument } from '@/graphql/reminders';
import { todayWindow } from '@/features/reminders/reminderTime';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { readPermissions } from '@/services/permissions';
import { useAuthStore } from '@/stores/auth.store';
import { ReminderRow } from '@/screens/reminders/ReminderRow';

/** Today at a glance: what is due, one tap to the dialer or search, and a nudge until calls are set up. */
export function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const name = useAuthStore((s) => s.user?.first_name ?? '');
  const filter = useMemo(() => ({ filter: { ...todayWindow(), status: 'PENDING' as const } }), []);
  const reminders = useGqlQuery(CrmAppRemindersDocument, filter, { fallbackError: t('crmApp.common.loadFailed'), skip: true });
  const { refetch } = reminders;
  useFocusEffect(
    useCallback(() => {
      fireAndForget(refetch(), logs.mobileApp, 'crm-app/HomeScreen', 'refetch');
    }, [refetch]),
  );
  const [phoneReady, setPhoneReady] = useState(true);

  useEffect(() => {
    readPermissions()
      .then((p) => setPhoneReady(p.phone && p.call))
      .catch(() => setPhoneReady(false));
  }, []);

  const due = reminders.data?.crmReminders ?? [];
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text fontSize="$8" fontWeight="800" role="heading">
        {t('crmApp.home.greeting', { vars: { name } })}
      </Text>
      {phoneReady ? null : (
        <Card title={t('crmApp.home.setupTitle')} testID="home-setup">
          <Text color="$muted">{t('crmApp.home.setupBody')}</Text>
          <DuncitButton label={t('crmApp.home.setupAction')} onPress={() => navigation.navigate('Tabs', { screen: 'Settings' })} />
        </Card>
      )}
      <XStack gap="$3">
        <YStack flex={1}>
          <DuncitButton label={t('crmApp.home.openDialer')} onPress={() => navigation.navigate('Tabs', { screen: 'Dialer' })} fullWidth testID="home-dialer" />
        </YStack>
        <YStack flex={1}>
          <DuncitButton
            label={t('crmApp.home.searchLeads')}
            onPress={() => navigation.navigate('Tabs', { screen: 'Leads' })}
            variant="outline"
            fullWidth
            testID="home-leads"
          />
        </YStack>
      </XStack>
      <Card title={t('crmApp.home.dueToday')}>
        <StateView
          loading={!reminders.data && !reminders.error}
          error={reminders.error}
          empty={reminders.data && due.length === 0 ? t('crmApp.home.nothingDue') : null}
          onRetry={reminders.refetch}
        />
        {due.map((r) => (
          <ReminderRow key={r.id} reminder={r} onChanged={reminders.refetch} />
        ))}
      </Card>
    </ScrollView>
  );
}
