import { useMemo, useState } from 'react';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';
import type { PodAuditLog } from '@duncit/utils';

import { LabeledInput } from '@/components/LabeledInput';
import { StackScreen } from '@/components/StackScreen';
import { LoadErrorNotice } from '@/components/club-admin/LoadErrorNotice';
import { LoadMoreButton } from '@/components/club-admin/LoadMoreButton';
import { PageHeading } from '@/components/club-admin/PageHeading';
import { toPodAuditLog } from '@/components/club-admin/audit-log';
import { AuditLogRow } from '@/components/club-admin/monitoring/AuditLogRow';
import { AuditLogSheet } from '@/components/club-admin/monitoring/AuditLogSheet';
import { useClubAdminAuditLogs } from '@/hooks/useClubAdminAuditLogs';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Pod Monitoring (AI) — the twin of mWeb's /clubs/monitoring (rule 27): every
 * pod edit, status change and critical action in the admin's clubs, risk-
 * scored by AI, searched server-side and paged on tap. A row opens its full
 * entry — the tracked changes, the note and the AI summary.
 */
export function ClubPodMonitoringScreen() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query.trim());
  const logs = useClubAdminAuditLogs(search);
  const [open, setOpen] = useState<PodAuditLog | null>(null);
  const rows = useMemo(() => logs.rows.map(toPodAuditLog), [logs.rows]);
  const empty = !logs.isLoading && !logs.hasError && rows.length === 0;
  const searchLabel = t('clubAdmin.monitoring.search');

  return (
    <StackScreen header title={t('mweb.meta.clubMonitoring.title')} testID="club-monitoring-screen">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <YStack gap={14} padding={16} paddingBottom={48}>
          <PageHeading
            title={t('clubAdmin.monitoring.title')}
            subtitle={t('clubAdmin.monitoring.subtitle')}
          />
          <LabeledInput
            testID="club-monitoring-search"
            label={searchLabel}
            placeholder={searchLabel}
            value={query}
            onChangeText={setQuery}
          />
          {logs.isLoading ? <Spinner testID="club-monitoring-loading" color="$primary" /> : null}
          {logs.hasError ? (
            <LoadErrorNotice testID="club-monitoring-error" onRetry={logs.refetch} />
          ) : null}
          {empty ? (
            <Text testID="club-monitoring-empty" fontSize={13} color="$muted">
              {t('clubAdmin.monitoring.noActivity')}
            </Text>
          ) : null}
          {rows.map((log) => (
            <AuditLogRow
              key={log.id}
              log={log}
              when={formatDateTime(log.created_at)}
              testID={`club-monitoring-row-${log.id}`}
              onPress={() => setOpen(log)}
            />
          ))}
          {logs.hasMore ? (
            <LoadMoreButton
              testID="club-monitoring-more"
              busy={logs.isLoadingMore}
              onPress={logs.loadMore}
            />
          ) : null}
        </YStack>
      </ScrollView>
      <AuditLogSheet
        log={open}
        when={open ? formatDateTime(open.created_at) : ''}
        onClose={() => setOpen(null)}
      />
    </StackScreen>
  );
}
