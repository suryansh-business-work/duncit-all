import { useCallback, useState } from 'react';
import { Text, YStack } from 'tamagui';
import type { PodAuditLog } from '@duncit/utils';

import { ClubAdminPodAuditLogsDocument } from '@/graphql/club-admin';
import type { ClubPodDetail } from '@/hooks/useClubPodDetail';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toPodAuditLog } from '../audit-log';
import { AuditLogChanges } from '../monitoring/AuditLogChanges';
import { AuditLogRow } from '../monitoring/AuditLogRow';
import { PodDetailLifecycle } from './PodDetailLifecycle';
import { PodDetailSection } from './PodDetailSection';

/** One entry of the trail with its changes folded underneath — the same pair
 * `ClubPodActivitySheet` renders from the pods list, so the pod's audit trail
 * has ONE look on the phone (rule 34). */
function ActivityEntry({ log, when }: Readonly<{ log: PodAuditLog; when: string }>) {
  return (
    <YStack paddingBottom={10} borderTopWidth={1} borderTopColor="$borderColor">
      <AuditLogRow log={log} when={when} testID={`club-pod-detail-activity-${log.id}`} />
      <YStack paddingHorizontal={16}>
        <AuditLogChanges log={log} testID={`club-pod-detail-activity-${log.id}-changes`} />
      </YStack>
    </YStack>
  );
}

/**
 * Lifecycle strip (Created → Pod date → Completed / Cancelled) plus the pod's
 * full audit activity, including who cancelled it and why.
 *
 * The Tamagui twin of `@duncit/pod-details`' `PodTimelineSection` (rule 27).
 * It reads the same club-scoped `clubAdminPodAuditLogs` document the pods
 * list's activity sheet already uses, and renders it through the same two
 * components, rather than growing a second audit view.
 */
export function PodDetailTimeline({ pod }: Readonly<{ pod: ClubPodDetail }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const [logs, setLogs] = useState<PodAuditLog[]>([]);
  const [hasError, setHasError] = useState(false);
  const podId = pod.id;

  const load = useCallback(async () => {
    const res = await graphqlRequest(
      ClubAdminPodAuditLogsDocument,
      { pod_doc_id: podId },
      { auth: true },
    );
    // A trail that failed to load is not an empty trail, so the error state
    // below never says "no activity" for a request that did not come back.
    setLogs(res.clubAdminPodAuditLogs.map(toPodAuditLog));
    setHasError(false);
  }, [podId]);

  const { isLoading, refetch } = useReloadableQuery(load, {
    enabled: Boolean(podId),
    onError: () => setHasError(true),
  });
  const settled = !isLoading && !hasError;
  const empty = settled && logs.length === 0 ? t('clubAdmin.pods.noActivity') : null;

  return (
    <PodDetailSection
      title={t('podDetailsPanel.podTimelineSection.timeline')}
      testID="club-pod-detail-timeline"
    >
      <PodDetailLifecycle pod={pod} />
      <Text
        role="heading"
        testID="club-pod-detail-activity-title"
        fontSize={14}
        fontWeight="600"
        color="$color"
      >
        {t('podDetailsPanel.podTimelineSection.activity')}
      </Text>
      {isLoading && logs.length === 0 ? (
        <Text testID="club-pod-detail-activity-loading" fontSize={13} color="$muted">
          {t('mweb.a11y.loading')}
        </Text>
      ) : null}
      {empty ? (
        <Text testID="club-pod-detail-activity-empty" fontSize={13} color="$muted">
          {empty}
        </Text>
      ) : null}
      {logs.map((log) => (
        <ActivityEntry key={log.id} log={log} when={formatDateTime(log.created_at)} />
      ))}
    </PodDetailSection>
  );
}
