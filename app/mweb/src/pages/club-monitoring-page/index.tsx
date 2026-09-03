import { useState } from 'react';
import { Stack } from '@mui/material';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import StudioPageHeader from '../../components/StudioPageHeader';
import AuditEntryCard from '../../components/club-admin/AuditEntryCard';
import PagedListBody from '../../components/club-admin/PagedListBody';
import { usePagedRows } from '../../components/club-admin/usePagedRows';
import type { AuditEntry } from '../../components/club-admin/audit-entry';
import AuditLogDetailDialog from './AuditLogDetailDialog';
import { MWEB_CLUB_ADMIN_POD_AUDIT_LOGS_TABLE } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

const PAGE_SIZE = 20;

/** Newest first, twenty at a time — the club scope is the server's. */
const auditPage = (page: number) => ({
  query: { page, page_size: PAGE_SIZE, sort_by: 'created_at', sort_dir: 'desc' },
});

/**
 * Pod Monitoring (AI) — every pod edit, status change and critical action in
 * the clubs the signed-in admin runs, risk-scored by the monitor. The Partners
 * console tables the same query; native twin: ClubPodMonitoring (rule 27).
 */
export default function ClubMonitoringPage() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const list = usePagedRows<AuditEntry>({
    document: MWEB_CLUB_ADMIN_POD_AUDIT_LOGS_TABLE,
    field: 'clubAdminPodAuditLogsTable',
    variables: auditPage,
  });

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <StudioPageHeader
        icon={<MonitorHeartIcon fontSize="small" />}
        title={t('clubAdmin.monitoring.title')}
        caption={t('clubAdmin.monitoring.subtitle')}
      />
      <PagedListBody
        loading={list.loading}
        error={list.error}
        count={list.rows.length}
        hasMore={list.hasMore}
        emptyText={t('clubAdmin.monitoring.noActivity')}
        onLoadMore={list.loadMore}
      >
        {list.rows.map((entry) => (
          <AuditEntryCard
            key={entry.id}
            entry={entry}
            title={entry.pod_title || entry.pod_id}
            onOpen={() => setSelected(entry)}
          />
        ))}
      </PagedListBody>
      <AuditLogDetailDialog entry={selected} onClose={() => setSelected(null)} />
    </Stack>
  );
}
