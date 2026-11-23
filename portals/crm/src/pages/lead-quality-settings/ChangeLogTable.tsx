import { useId, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import type { QueryCrmLeadQualitySettingsHistoryArgs } from '@duncit/gql-types';
import { formatDateTime } from '@duncit/app-settings';
import { DuncitTable, EM_DASH, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { LEAD_QUALITY_SETTINGS_HISTORY, type LeadQualityEvent } from '../../api/leadQuality.gql';
import type { CrmLeadEntityType } from '../../api/crm.types';
import { keyOr } from '../../components/lead-quality/qualityLabels';
import { CHANGE_KIND_KEY } from './configStatus';

/** The most recent settings changes the log lists. */
const HISTORY_LIMIT = 100;

const getRowId = (row: LeadQualityEvent) => row.id;
const searchOf = (row: LeadQualityEvent) => `${row.kind} ${row.config_version ?? ''} ${row.actor.name} ${row.note}`;

/** Drafts saved, versions published and drafts discarded for the lead type, newest first. */
export default function ChangeLogTable({ leadType }: Readonly<{ leadType: CrmLeadEntityType }>) {
  const { t } = useTranslation();
  const headingId = useId();
  const { data, loading, error } = useQuery<{ crmLeadQualitySettingsHistory: LeadQualityEvent[] }, QueryCrmLeadQualitySettingsHistoryArgs>(
    LEAD_QUALITY_SETTINGS_HISTORY,
    { variables: { lead_type: leadType, limit: HISTORY_LIMIT }, fetchPolicy: 'cache-and-network' },
  );
  const columns = useMemo<DuncitColumn<LeadQualityEvent>[]>(() => {
    const kindLabel = (kind: string) => t(keyOr(CHANGE_KIND_KEY, kind, 'crm.leadQualitySettings.kindOther'));
    return [
      {
        field: 'created_at',
        headerName: t('crm.leadQualitySettings.colWhen'),
        type: 'date',
        width: 190,
        valueGetter: (row) => formatDateTime(row.created_at) || EM_DASH,
      },
      {
        field: 'kind',
        headerName: t('crm.leadQualitySettings.colChange'),
        type: 'enum',
        options: Object.keys(CHANGE_KIND_KEY).map((kind) => ({ value: kind, label: kindLabel(kind) })),
        width: 170,
        valueGetter: (row) => kindLabel(row.kind),
      },
      {
        field: 'config_version',
        headerName: t('crm.leadQualitySettings.colVersion'),
        type: 'number',
        width: 110,
        valueGetter: (row) => row.config_version ?? EM_DASH,
      },
      { field: 'actor.name', headerName: t('crm.leadQualitySettings.colBy'), type: 'text', width: 170, valueGetter: (row) => row.actor.name || EM_DASH },
      { field: 'note', headerName: t('crm.leadQualitySettings.colNote'), type: 'text', flex: 1, minWidth: 200, valueGetter: (row) => row.note || EM_DASH },
    ];
  }, [t]);
  const rows = data?.crmLeadQualitySettingsHistory;
  const fetchRows = useMemo(() => clientTableFetch(rows ?? [], searchOf, columns), [rows, columns]);

  return (
    <Stack component="section" spacing={1} aria-labelledby={headingId} data-testid="lead-quality-change-log">
      <Typography id={headingId} variant="h6" component="h2" sx={{ fontWeight: 700 }}>
        {t('crm.leadQualitySettings.changesTitle')}
      </Typography>
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      <DuncitTable<LeadQualityEvent>
        tableId="crm-lead-quality-change-log"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder={t('crm.leadQualitySettings.changesSearch')}
        emptyText={t(loading ? 'crm.leadQualitySettings.loading' : 'crm.leadQualitySettings.changesEmpty')}
        ariaLabel={t('crm.leadQualitySettings.changesTitle')}
      />
    </Stack>
  );
}
