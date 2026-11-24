import { useCallback, useLayoutEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { Text, XStack, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import { StateView } from '@/components/StateView';
import { isLeadKind, type LeadKind } from '@/features/leads/leadKinds';
import { useLead } from '@/features/leads/useLead';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { LeadActivity } from './LeadActivity';
import { LeadOverview } from './LeadOverview';
import { LeadReminders } from './LeadReminders';

const TABS = ['overview', 'activity', 'reminders'] as const;
type Tab = (typeof TABS)[number];

function LeadDetail({ kind, id }: Readonly<{ kind: LeadKind; id: string }>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const [tab, setTab] = useState<Tab>('overview');
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
    return <StateView loading={loading || (!error && !lead)} error={error ?? null} onRetry={refetch} />;
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <YStack>
        <Text fontSize="$8" fontWeight="800" role="heading">
          {lead.name}
        </Text>
        <Text color="$muted">{t(`crmApp.kind.${kind}`)}</Text>
      </YStack>
      <XStack gap="$2" role="tablist">
        {TABS.map((key) => (
          <YStack key={key} flex={1}>
            <DuncitButton label={t(`crmApp.lead.${key}`)} onPress={() => setTab(key)} variant={tab === key ? 'solid' : 'outline'} size="sm" fullWidth testID={`lead-tab-${key}`} />
          </YStack>
        ))}
      </XStack>
      {tab === 'overview' ? (
        <LeadOverview
          lead={lead}
          onAddNote={() => navigation.navigate('AddNote', { kind, id, name: lead.name })}
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
  if (!isLeadKind(params.kind) || !params.id) return <StateView error={t('crmApp.lead.notFound')} />;
  return <LeadDetail kind={params.kind} id={params.id} />;
}
