import { useCallback, useMemo } from 'react';
import { FlatList } from 'react-native';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';
import { YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import { StateView } from '@/components/StateView';
import { CrmAppRemindersDocument } from '@/graphql/reminders';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { ReminderRow } from './ReminderRow';

/** Every pending reminder, soonest first — the portal's Reminders, as a list. */
export function RemindersScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const variables = useMemo(() => ({ filter: { status: 'PENDING' as const } }), []);
  const { data, loading, error, refetch } = useGqlQuery(CrmAppRemindersDocument, variables, {
    fallbackError: t('crmApp.common.loadFailed'),
    skip: true,
  });
  // Loaded each time the tab is shown, so a reminder added elsewhere is already here.
  useFocusEffect(
    useCallback(() => {
      fireAndForget(refetch(), logs.mobileApp, 'crm-app/RemindersScreen', 'refetch');
    }, [refetch]),
  );
  const rows = useMemo(
    () => [...(data?.crmReminders ?? [])].sort((a, b) => a.due_at.localeCompare(b.due_at)),
    [data],
  );

  return (
    <YStack flex={1} backgroundColor="$background">
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16 }}
        refreshing={loading && data !== null}
        onRefresh={refetch}
        renderItem={({ item }) => <ReminderRow reminder={item} onChanged={refetch} />}
        ListHeaderComponent={
          <YStack paddingBottom="$3">
            <DuncitButton label={t('crmApp.reminder.title')} onPress={() => navigation.navigate('AddReminder', {})} testID="reminders-add" />
          </YStack>
        }
        ListEmptyComponent={
          <StateView loading={!data && !error} error={error} empty={data ? t('crmApp.reminder.empty') : null} onRetry={refetch} />
        }
      />
    </YStack>
  );
}
