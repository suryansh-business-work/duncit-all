import { useCallback, useState } from 'react';
import { FlatList, ScrollView } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Input, Text, XStack, YStack } from 'tamagui';
import { CRM_CANDIDATE_STATUS_KEY, CRM_CANDIDATE_STATUS_TONE, crmFormatScore } from '@duncit/utils';

import { SURFACE } from '@/components/surface';
import { DuncitButton } from '@/components/DuncitButton';
import { SelectChip } from '@/components/mobile/SelectChip';
import { StateView } from '@/components/StateView';
import { ToneChip } from '@/components/ToneChip';
import { CrmAppLeadCandidatesDocument } from '@/graphql/leadResearch';
import { usePagedSearch } from '@/hooks/usePagedSearch';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { gqlRequest } from '@/services/graphql.client';

const STATUSES = ['NEW', 'ADDED', 'REJECTED', 'DUPLICATE'] as const;
type Row = {
  id: string;
  lead_type: string;
  name: string;
  city?: string | null;
  score?: number | null;
  status: string;
};

interface Props {
  /** A discovery the queue is narrowed to (from Discoveries › Show candidates). */
  jobId: string | null;
  onClearJob: () => void;
}

/** The review queue: every candidate newest first, by status, searchable, narrowed to one discovery if asked. */
export function ReviewQueue({ jobId, onClearJob }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const fetchPage = useCallback(
    async (page: number, pageSize: number) => {
      const filters = [
        ...(jobId ? [{ field: 'job_id', op: 'eq' as const, value: jobId }] : []),
        ...(status ? [{ field: 'status', op: 'eq' as const, value: status }] : []),
      ];
      const { crmLeadCandidatesTable } = await gqlRequest(CrmAppLeadCandidatesDocument, {
        query: {
          search: search.trim() || null,
          page,
          page_size: pageSize,
          sort_by: 'created_at',
          sort_dir: 'desc',
          filters,
        },
      });
      return { rows: crmLeadCandidatesTable.rows, total: crmLeadCandidatesTable.total };
    },
    [search, status, jobId],
  );
  const queue = usePagedSearch<Row>(fetchPage, {
    fallbackError: t('crmApp.common.loadFailed'),
    scope: 'crm-app/ReviewQueue',
  });
  const dash = t('crmApp.common.dash');

  return (
    <FlatList
      data={queue.rows}
      keyExtractor={(row) => row.id}
      onEndReached={queue.loadMore}
      onEndReachedThreshold={0.4}
      refreshing={false}
      onRefresh={queue.refresh}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      ListHeaderComponent={
        <YStack gap="$2" marginBottom="$2">
          {jobId ? (
            <XStack alignItems="center" gap="$2" testID="job-filter">
              <Text flex={1} color="$muted">
                {t('crm.leadResearch.filteredByJob')}
              </Text>
              <DuncitButton
                label={t('crm.leadResearch.showAllCandidates')}
                onPress={onClearJob}
                variant="ghost"
                size="sm"
                testID="job-filter-clear"
              />
            </XStack>
          ) : null}
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder={t('crm.leadResearch.queueSearch')}
            aria-label={t('crm.leadResearch.queueSearch')}
            placeholderTextColor="$muted"
            borderColor="$inputBorder"
            autoCorrect={false}
            testID="queue-search"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <XStack gap="$2" role="radiogroup">
              <SelectChip
                label={t('crmApp.leads.all')}
                onPress={() => setStatus(null)}
                selected={!status}
                testID="queue-status-all"
              />
              {STATUSES.map((s) => (
                <SelectChip
                  key={s}
                  label={t(CRM_CANDIDATE_STATUS_KEY[s] ?? s)}
                  onPress={() => setStatus(s)}
                  selected={status === s}
                  testID={`queue-status-${s}`}
                />
              ))}
            </XStack>
          </ScrollView>
        </YStack>
      }
      renderItem={({ item }) => (
        <XStack
          role="button"
          aria-label={item.name}
          onPress={() => navigation.navigate('Candidate', { id: item.id })}
          alignItems="center"
          gap="$2"
          {...SURFACE}
          pressStyle={{ backgroundColor: '$soft' }}
          testID={`candidate-row-${item.id}`}
        >
          <YStack flex={1}>
            <Text fontWeight="700" numberOfLines={1}>
              {item.name}
            </Text>
            <Text color="$muted" fontSize="$2">
              {[t(`crmApp.kind.${item.lead_type}`), item.city, crmFormatScore(item.score, dash)]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </YStack>
          <ToneChip
            label={t(CRM_CANDIDATE_STATUS_KEY[item.status] ?? item.status)}
            tone={CRM_CANDIDATE_STATUS_TONE[item.status] ?? 'default'}
          />
        </XStack>
      )}
      ListEmptyComponent={
        <StateView
          loading={queue.loading}
          error={queue.error}
          empty={t('crm.leadResearch.queueEmpty')}
          onRetry={queue.refresh}
        />
      }
      ListFooterComponent={
        queue.rows.length > 0 && queue.loading ? <StateView loading inline /> : null
      }
    />
  );
}
