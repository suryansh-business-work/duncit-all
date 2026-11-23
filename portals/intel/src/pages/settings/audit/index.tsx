import { useMemo, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Chip, MenuItem, Stack, TextField, Tooltip } from '@mui/material';
import type { IntelAuditRow } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { SectionCard } from '@duncit/ui';
import { INTEL_AUDIT, type AuditData } from '../../../graphql/admin';

const TYPES = ['', 'SESSION', 'SETTINGS', 'CONNECTOR', 'SYNC', 'MEDIA', 'CHAT', 'TOOL', 'APPROVAL', 'WRITE', 'VIOLATION'] as const;
const STATUS_COLOR: Record<string, 'success' | 'error' | 'warning'> = { OK: 'success', FAILED: 'error', DENIED: 'warning' };

/** Settings › Audit Logs: every Intel sign-in, change, sync, tool call, approval and production write — sealed rows. */
export default function AuditSection() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [type, setType] = useState<string>('');
  const fetchRows = useMemo<TableFetch<IntelAuditRow>>(
    () => async (q) => {
      const res = await client.query<AuditData>({ query: INTEL_AUDIT, variables: { type: type || null, search: q.search || null, page: q.page, page_size: q.pageSize }, fetchPolicy: 'network-only' });
      return { rows: res.data?.intelAudit.rows ?? [], total: res.data?.intelAudit.total ?? 0 };
    },
    [client, type]
  );
  const columns = useMemo<DuncitColumn<IntelAuditRow>[]>(
    () => [
      dateColumn<IntelAuditRow>({ field: 'created_at', headerName: t('intel.settings.audit.when'), hide: false, getDate: (r) => r.created_at }),
      { field: 'type', headerName: t('intel.settings.audit.type'), width: 120, type: 'text', valueGetter: (r) => r.type },
      { field: 'action', headerName: t('intel.settings.audit.action'), width: 200, type: 'text', valueGetter: (r) => r.action },
      { field: 'status', headerName: t('intel.settings.audit.status'), width: 110, type: 'text', valueGetter: (r) => r.status, cellRenderer: (r) => <Chip size="small" variant="outlined" color={STATUS_COLOR[r.status] ?? 'success'} label={r.status} /> },
      { field: 'environment', headerName: t('intel.settings.audit.environment'), width: 120, type: 'text', valueGetter: (r) => r.environment },
      { field: 'target', headerName: t('intel.settings.audit.target'), flex: 1, minWidth: 200, type: 'text', valueGetter: (r) => r.target, cellRenderer: (r) => <Tooltip title={r.detail}><span>{r.target}</span></Tooltip> },
      { field: 'sealed', headerName: t('intel.settings.audit.sealed'), width: 110, type: 'text', valueGetter: (r) => (r.sealed ? t('intel.settings.audit.intact') : t('intel.settings.audit.broken')), cellRenderer: (r) => <Chip size="small" color={r.sealed ? 'success' : 'error'} label={r.sealed ? t('intel.settings.audit.intact') : t('intel.settings.audit.broken')} /> },
    ],
    [t]
  );
  return (
    <SectionCard title={t('intel.settings.sections.audit')} subtitle={t('intel.settings.audit.subtitle')}>
      <Stack spacing={1.5}>
        <TextField select size="small" label={t('intel.settings.audit.type')} value={type} onChange={(e) => setType(e.target.value)} sx={{ maxWidth: 240 }}>
          {TYPES.map((v) => <MenuItem key={v || 'all'} value={v}>{v || t('intel.settings.audit.allTypes')}</MenuItem>)}
        </TextField>
        <DuncitTable<IntelAuditRow> ariaLabel={t('intel.settings.sections.audit')} tableId="intel-audit" columns={columns} fetchRows={fetchRows} getRowId={(r) => r.id} emptyText={t('intel.settings.audit.empty')} searchPlaceholder={t('intel.settings.audit.search')} />
      </Stack>
    </SectionCard>
  );
}
