import { useCallback, useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';
import { Text, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import { StateView } from '@/components/StateView';
import {
  CrmAppCancelDiscoveryDocument,
  CrmAppDiscoveryJobsDocument,
  CrmAppRetryDiscoveryDocument,
} from '@/graphql/leadResearch';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { gqlRequest } from '@/services/graphql.client';
import { errorCode, errorMessage } from '@/utils/errors';
import { DiscoveryJobCard } from './DiscoveryJobCard';

const SCOPE = 'crm-app/Discoveries';
/** The discoveries the list shows, newest first — the portal's own limit. */
const JOB_LIMIT = 20;
/** While one runs, its progress is re-read this often. */
const POLL_MS = 10_000;

/** Discoveries: start one, watch running ones fill up, cancel or retry, and open a job's candidates. */
export function Discoveries({ onShowJob }: Readonly<{ onShowJob: (jobId: string) => void }>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { data, loading, error, refetch } = useGqlQuery(
    CrmAppDiscoveryJobsDocument,
    { limit: JOB_LIMIT },
    { fallbackError: t('crmApp.common.loadFailed') },
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const jobs = data?.crmLeadDiscoveryJobs ?? [];
  const running = jobs.some((job) => job.status === 'RUNNING');

  useFocusEffect(
    useCallback(() => fireAndForget(refetch(), logs.mobileApp, SCOPE, 'focus'), [refetch]),
  );
  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(
      () => fireAndForget(refetch(), logs.mobileApp, SCOPE, 'poll'),
      POLL_MS,
    );
    return () => clearInterval(timer);
  }, [running, refetch]);

  const act = async (run: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await run();
      await refetch();
    } catch (err) {
      setActionError(
        errorCode(err) === 'FORBIDDEN'
          ? t('crm.leadResearch.cancelForbidden')
          : errorMessage(err, t('crmApp.common.saveFailed')),
      );
    }
  };

  return (
    <FlatList
      data={jobs}
      keyExtractor={(job) => job.id}
      refreshing={false}
      onRefresh={refetch}
      contentContainerStyle={{ padding: 12, gap: 8 }}
      ListHeaderComponent={
        <YStack gap="$2" marginBottom="$2">
          <Text color="$muted" fontSize="$2">
            {t('crm.leadResearch.discoveriesHint')}
          </Text>
          <DuncitButton
            label={t('crm.leadResearch.discoverLeads')}
            onPress={() => navigation.navigate('LeadDiscovery')}
            fullWidth
            testID="discover-leads"
          />
          {actionError ? (
            <Text color="$danger" role="alert" testID="discovery-action-error">
              {actionError}
            </Text>
          ) : null}
        </YStack>
      }
      renderItem={({ item }) => (
        <DiscoveryJobCard
          job={item}
          onShow={() => onShowJob(item.id)}
          onCancel={() =>
            fireAndForget(
              act(() => gqlRequest(CrmAppCancelDiscoveryDocument, { id: item.id })),
              logs.mobileApp,
              SCOPE,
              'cancel',
            )
          }
          onRetry={() =>
            fireAndForget(
              act(() => gqlRequest(CrmAppRetryDiscoveryDocument, { id: item.id })),
              logs.mobileApp,
              SCOPE,
              'retry',
            )
          }
        />
      )}
      ListEmptyComponent={
        <StateView
          loading={loading && !data}
          error={error}
          empty={t('crm.leadResearch.noDiscoveries')}
          onRetry={refetch}
        />
      }
    />
  );
}
