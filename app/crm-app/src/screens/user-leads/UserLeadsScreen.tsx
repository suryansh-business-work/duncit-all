import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList } from 'react-native';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';
import { Input, Text, XStack, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { SURFACE } from '@/components/surface';
import { DuncitButton } from '@/components/DuncitButton';
import { KpiGrid } from '@/components/KpiGrid';
import { StateView } from '@/components/StateView';
import { CrmAppUserLeadStatsDocument, CrmAppUserLeadsDocument } from '@/graphql/userLeads';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { usePagedSearch } from '@/hooks/usePagedSearch';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { gqlRequest } from '@/services/graphql.client';
import { CleanUserLeads } from './CleanUserLeads';

const NO_VARS = {};
type Row = { id: string; phone: string; name?: string | null; source_account?: string | null };

/**
 * CRM › User Leads › WhatsApp Leads: the counts, the leads found in WhatsApp
 * communities and groups (searchable, page by page), add one by hand, and the
 * clean-up — the portal page on the phone. Import / export stay on the portal.
 */
export function UserLeadsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const [search, setSearch] = useState('');
  const loadFailed = t('crmApp.common.loadFailed');
  const stats = useGqlQuery(CrmAppUserLeadStatsDocument, NO_VARS, { fallbackError: loadFailed });
  const fetchPage = useCallback(
    async (page: number, pageSize: number) => {
      const { waUserLeads } = await gqlRequest(CrmAppUserLeadsDocument, {
        input: { search: search.trim() || null, page, page_size: pageSize },
      });
      return { rows: waUserLeads.items, total: waUserLeads.total };
    },
    [search],
  );
  const leads = usePagedSearch<Row>(fetchPage, {
    fallbackError: loadFailed,
    scope: 'crm-app/UserLeads',
  });
  const { refresh: refreshLeads } = leads;
  const { refetch: refetchStats } = stats;
  const refreshAll = useCallback(() => {
    fireAndForget(refreshLeads(), logs.mobileApp, 'crm-app/UserLeads', 'refresh');
    fireAndForget(refetchStats(), logs.mobileApp, 'crm-app/UserLeads', 'stats');
  }, [refreshLeads, refetchStats]);
  // Back from adding, editing or deleting: show the list as it is now. The first
  // focus is the screen opening (its own first load covers it), and a new search
  // must not refresh again — so the focus handler reads the latest refresh.
  const latestRefresh = useRef(refreshAll);
  useEffect(() => {
    latestRefresh.current = refreshAll;
  }, [refreshAll]);
  const opened = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (opened.current) latestRefresh.current();
      opened.current = true;
    }, []),
  );

  const s = stats.data?.waLeadStats;
  return (
    <YStack flex={1} backgroundColor="$background">
      <FlatList
        data={leads.rows}
        keyExtractor={(row) => row.id}
        onEndReached={leads.loadMore}
        onEndReachedThreshold={0.4}
        refreshing={false}
        onRefresh={refreshAll}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        ListHeaderComponent={
          <YStack gap="$3" marginBottom="$2">
            {s ? (
              <KpiGrid
                items={[
                  {
                    key: 'leads',
                    label: t('crmApp.userLeads.leads'),
                    value: String(s.total_leads),
                    icon: 'person-search',
                    tone: 'accentText',
                  },
                  {
                    key: 'communities',
                    label: t('crmApp.userLeads.communities'),
                    value: String(s.total_communities),
                    icon: 'groups',
                    tone: 'info',
                  },
                  {
                    key: 'groups',
                    label: t('crmApp.userLeads.groups'),
                    value: String(s.total_groups),
                    icon: 'diversity-3',
                    tone: 'success',
                  },
                  {
                    key: 'contacts',
                    label: t('crmApp.userLeads.contacts'),
                    value: String(s.total_contacts),
                    icon: 'contacts',
                    tone: 'warning',
                  },
                ]}
              />
            ) : null}
            <XStack gap="$2">
              <YStack flex={1}>
                <DuncitButton
                  label={t('crm.userLeads.newUserLead')}
                  onPress={() => navigation.navigate('UserLeadEditor', {})}
                  fullWidth
                  size="sm"
                  testID="user-leads-new"
                />
              </YStack>
              <CleanUserLeads onCleaned={refreshAll} />
            </XStack>
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder={t('crmApp.userLeads.search')}
              aria-label={t('crmApp.userLeads.search')}
              placeholderTextColor="$muted"
              borderColor="$inputBorder"
              autoCorrect={false}
              testID="user-leads-search"
            />
            {leads.total > 0 ? (
              <Text color="$muted" fontSize="$2" aria-live="polite">
                {t('crmApp.leads.count', { count: leads.total })}
              </Text>
            ) : null}
          </YStack>
        }
        renderItem={({ item }) => (
          <YStack
            role="button"
            aria-label={item.name || item.phone}
            onPress={() => navigation.navigate('UserLeadDetail', { id: item.id })}
            {...SURFACE}
            pressStyle={{ backgroundColor: '$soft' }}
            testID={`user-lead-row-${item.id}`}
          >
            <Text fontWeight="700">{item.name || item.phone}</Text>
            <Text color="$muted" fontSize="$2">
              {[
                item.name ? item.phone : null,
                item.source_account ? `+${item.source_account}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </YStack>
        )}
        ListEmptyComponent={
          <StateView
            loading={leads.loading}
            error={leads.error}
            empty={t('crmApp.userLeads.empty')}
            onRetry={leads.refresh}
          />
        }
        ListFooterComponent={leads.rows.length > 0 && leads.loading ? <StateView loading /> : null}
      />
    </YStack>
  );
}
