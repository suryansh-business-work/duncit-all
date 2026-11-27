import { useCallback, useLayoutEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { Text, YStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { IconButton } from '@/components/mobile/IconButton';
import { StateView } from '@/components/StateView';
import { TabBar } from '@/components/TabBar';
import { MOBILE } from '@/constants/design';
import { isLeadKind, type LeadKind } from '@/features/leads/leadKinds';
import { useLead } from '@/features/leads/useLead';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { LeadOverviewTab } from './LeadOverviewTab';
import { leadPaneFor, leadTabLabel, leadTabsFor } from './leadTabs';
import { LeadContactActions } from './tabs/contacts/LeadContactActions';

const SCOPE = 'crm-app/LeadDetailScreen';
/** The kind line scrolls away; the tab row (child 1) stays pinned under the header. */
const STICKY_TABS = [1];

function LeadDetail({ kind, id }: Readonly<{ kind: LeadKind; id: string }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const [tab, setTab] = useState<string>('overview');
  const [leadValues, setLeadValues] = useState<Readonly<Record<string, string>>>();
  const { lead, loading, error, refetch } = useLead(kind, id, t('crmApp.common.loadFailed'));
  const reload = useCallback(() => {
    fireAndForget(refetch(), logs.mobileApp, SCOPE, 'refetch');
  }, [refetch]);

  // Re-read on return from Add note / Add reminder / Edit, so the change is there.
  useFocusEffect(reload);
  useLayoutEffect(() => {
    if (!lead) return;
    navigation.setOptions({
      title: lead.name,
      headerRight: () => (
        <IconButton
          icon={{ name: 'edit' }}
          label={t('crmApp.editor.edit')}
          color={theme.onPrimary?.val}
          onPress={() => navigation.navigate('LeadEditor', { kind, id })}
          testID="lead-edit"
        />
      ),
    });
  }, [lead, navigation, t, theme.onPrimary?.val, kind, id]);

  if (!lead) {
    return <StateView loading={loading || !error} error={error ?? null} onRetry={refetch} />;
  }
  const props = { kind, id, lead, onChanged: reload };
  const Pane = leadPaneFor(kind, tab);
  const active = Pane ? tab : 'overview';
  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        stickyHeaderIndices={STICKY_TABS}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: MOBILE.gutter }}
      >
        {/* The header already carries the lead's name; this line says what kind it is. */}
        <Text color="$muted" paddingHorizontal="$4" paddingTop="$3" testID="lead-kind">
          {t(`crmApp.kind.${kind}`)}
        </Text>
        <YStack backgroundColor="$background" paddingHorizontal="$4">
          <TabBar
            tabs={leadTabsFor(kind).map((key) => ({ key, label: leadTabLabel(key, t, lead) }))}
            active={active}
            onChange={setTab}
            testID="lead-tab"
          />
        </YStack>
        <YStack padding="$4" gap="$3">
          {Pane ? (
            <Pane {...props} />
          ) : (
            <LeadOverviewTab {...props} onOpenTab={setTab} onLeadValues={setLeadValues} />
          )}
        </YStack>
      </ScrollView>
      {/* Ask AI has its own composer at the bottom; every other tab keeps the actions under the thumb. */}
      {active === 'ask-ai' ? null : (
        <LeadContactActions
          kind={kind}
          id={id}
          name={lead.name}
          lead={lead}
          leadValues={leadValues}
          onAddNote={() => navigation.navigate('AddNote', { kind, id, name: lead.name })}
          onAddReminder={() => navigation.navigate('AddReminder', { kind, id, name: lead.name })}
        />
      )}
    </YStack>
  );
}

/** A lead, opened from a list, search, a reminder, the dialer or the caller ID card. */
export function LeadDetailScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<RouteProp<AppStackParamList, 'LeadDetail'>>();
  // The deep link carries the kind as text; anything the API does not know is "not found".
  if (!isLeadKind(params.kind) || !params.id)
    return <StateView error={t('crmApp.lead.notFound')} />;
  return <LeadDetail kind={params.kind} id={params.id} />;
}
