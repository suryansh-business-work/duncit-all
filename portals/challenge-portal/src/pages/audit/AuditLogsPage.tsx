import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, dateColumn, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { CHALLENGE_AUDIT_TABLE, type AuditRow } from '../../graphql/pod-challenges';

const rowId = (r: AuditRow) => r.id;
const EMPTY_JSON = new Set(['null', '{}', '']);

/** "before → after" for one audited change, or a dash when the step carried no values. */
function changeOf(r: AuditRow): string {
  const before = EMPTY_JSON.has(r.old_value_json) ? '' : r.old_value_json;
  const after = EMPTY_JSON.has(r.new_value_json) ? '' : r.new_value_json;
  if (before && after) return `${before} → ${after}`;
  return before || after || '—';
}

/** Challenge Portal > Audit Logs: every lifecycle step, setting change, score correction and result publication. */
export default function AuditLogsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<AuditRow>(client, CHALLENGE_AUDIT_TABLE, 'challengeAuditTable');
  const columns = useMemo<DuncitColumn<AuditRow>[]>(
    () => [
      dateColumn<AuditRow>({ field: 'created_at', headerName: t('challenge.audit.colWhen'), hide: false, width: 170 }),
      { field: 'challenge_name', headerName: t('challenge.audit.colChallenge'), type: 'text', minWidth: 200, flex: 1, sortable: false, filterable: false },
      { field: 'action', headerName: t('challenge.audit.colAction'), type: 'text', width: 190 },
      { field: 'actor_name', headerName: t('challenge.audit.colActor'), type: 'text', minWidth: 160, sortable: false, filterable: false, valueGetter: (r) => r.actor_name || '—' },
      { field: 'reason', headerName: t('challenge.audit.colReason'), type: 'text', minWidth: 200, flex: 1, sortable: false, filterable: false, valueGetter: (r) => r.reason || '—' },
      { field: 'new_value_json', headerName: t('challenge.audit.colChange'), type: 'text', minWidth: 260, flex: 2, sortable: false, filterable: false, valueGetter: changeOf },
    ],
    [t]
  );

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <HistoryIcon color="primary" />
        <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
          {t('challenge.audit.title')}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('challenge.audit.subtitle')}
      </Typography>
      <DuncitTable<AuditRow>
        ariaLabel={t('challenge.audit.title')}
        tableId="challenge-portal-audit"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={rowId}
        emptyText={t('challenge.audit.empty')}
        searchPlaceholder={t('challenge.audit.search')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
      />
    </Stack>
  );
}
