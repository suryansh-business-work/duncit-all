import { useEffect, useState } from 'react';
import { Spinner, Text, YStack } from 'tamagui';
import type { PodAuditLog } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { ClubAdminPodAuditLogsDocument } from '@/graphql/club-admin';
import type { ClubAdminPodRow } from '@/hooks/useClubAdminPods';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toPodAuditLog } from '../audit-log';
import { AuditLogChanges } from '../monitoring/AuditLogChanges';
import { AuditLogRow } from '../monitoring/AuditLogRow';

interface Props {
  pod: ClubAdminPodRow | null;
  onClose: () => void;
}

/** One pod's full trail, newest first, fetched while the sheet is open. Each
 * entry shows its changes inline: a sheet cannot open a second sheet on iOS. */
export function ClubPodActivitySheet({ pod, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const [logs, setLogs] = useState<PodAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const podId = pod?.id ?? null;

  useEffect(() => {
    if (!podId) {
      setLogs([]);
      return undefined;
    }
    let active = true;
    setIsLoading(true);
    graphqlRequest(ClubAdminPodAuditLogsDocument, { pod_doc_id: podId }, { auth: true })
      .then((res) => active && setLogs(res.clubAdminPodAuditLogs.map(toPodAuditLog)))
      .catch(() => active && setLogs([]))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [podId]);

  const closeLabel = t('mweb.common.close');
  const footer = (
    <DuncitButton
      testID="club-pod-activity-close"
      label={closeLabel}
      onPress={onClose}
      variant="outline"
      tone="neutral"
      fullWidth
    />
  );

  return (
    <DuncitDialog
      open={!!pod}
      onClose={onClose}
      testID="club-pod-activity"
      title={t('clubAdmin.pods.activity', { vars: { title: pod?.pod_title ?? '' } })}
      closeLabel={closeLabel}
      footer={footer}
    >
      <YStack gap={10}>
        {isLoading ? <Spinner testID="club-pod-activity-loading" color="$primary" /> : null}
        {!isLoading && logs.length === 0 ? (
          <Text testID="club-pod-activity-empty" fontSize={13} color="$muted">
            {t('clubAdmin.pods.noActivity')}
          </Text>
        ) : null}
        {logs.map((log) => (
          <YStack key={log.id} gap={8}>
            <AuditLogRow
              log={log}
              when={formatDateTime(log.created_at)}
              testID={`club-pod-activity-${log.id}`}
            />
            <AuditLogChanges log={log} testID={`club-pod-activity-${log.id}-changes`} />
          </YStack>
        ))}
      </YStack>
    </DuncitDialog>
  );
}
