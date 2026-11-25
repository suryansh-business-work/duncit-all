import { useCallback, useLayoutEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { Text, XStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import { StateView } from '@/components/StateView';
import { TabBar } from '@/components/TabBar';
import { isLeadKind, type LeadKind } from '@/features/leads/leadKinds';
import { useLead } from '@/features/leads/useLead';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { LeadActivity } from './LeadActivity';
import { LeadOverview } from './LeadOverview';
import { LeadReminders } from './LeadReminders';

const TABS = ['overview', 'activity', 'reminders'] as const;

function LeadDetail({ kind, id }: Readonly<{ kind: LeadKind; id: string }>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const [tab, setTab] = useState<string>('overview');
  const { lead, loading, error, refetch } = useLead(kind, id, t('crmApp.common.loadFailed'));

  // Re-read on return from Add note / Add reminder, so the new entry is there.
  useFocusEffect(
    useCallback(() => {
      fireAndForget(refetch(), logs.mobileApp, 'crm-app/LeadDetailScreen', 'refetch');
    }, [refetch]),
  );
  useLayoutEffect(() => {
    if (lead) navigation.setOptions({ title: lead.name });
  }, [lead, navigation]);

  if (!lead) {
    return <StateView loading={loading || !error} error={error ?? null} onRetry={refetch} />;
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {/* The header already carries the lead's name; this row says what kind it is. */}
      <XStack alignItems="center" gap="$2">
        <Text flex={1} color="$muted">
          {t(`crmApp.kind.${kind}`)}
        </Text>
        <DuncitButton
          label={t('crmApp.editor.edit')}
          onPress={() => navigation.navigate('LeadEditor', { kind, id })}
          variant="outline"
          size="sm"
          testID="lead-edit"
        />
      </XStack>
      <TabBar
        tabs={TABS.map((key) => ({ key, label: t(`crmApp.lead.${key}`) }))}
        active={tab}
        onChange={setTab}
        testID="lead-tab"
      />
      {tab === 'overview' ? (
        <LeadOverview
          lead={lead}
          onAddNote={() => navigation.navigate('AddNote', { kind, id, name: lead.name })}
          onCall={(to, contactName) =>
            navigation.navigate('Call', { kind, id, to, leadName: lead.name, contactName })
          }
          onAddReminder={() => navigation.navigate('AddReminder', { kind, id, name: lead.name })}
        />
      ) : null}
      {tab === 'activity' ? <LeadActivity kind={kind} id={id} /> : null}
      {tab === 'reminders' ? <LeadReminders kind={kind} id={id} /> : null}
    </ScrollView>
  );
}

/** A lead, opened from search, a reminder, the dialer or the caller ID card. */
export function LeadDetailScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<RouteProp<AppStackParamList, 'LeadDetail'>>();
  // The deep link carries the kind as text; anything the API does not know is "not found".
  if (!isLeadKind(params.kind) || !params.id)
    return <StateView error={t('crmApp.lead.notFound')} />;
  return <LeadDetail kind={params.kind} id={params.id} />;
}
