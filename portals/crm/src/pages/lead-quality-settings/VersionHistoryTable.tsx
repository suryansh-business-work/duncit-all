import { useId, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import type { QueryCrmLeadQualityVersionsArgs } from '@duncit/gql-types';
import { DuncitTable, clientTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { LEAD_QUALITY_VERSIONS, type LeadQualityConfig } from '../../api/leadQuality.gql';
import type { CrmLeadEntityType } from '../../api/crm.types';
import { versionColumns } from './versionColumns';

const getRowId = (row: LeadQualityConfig) => row.id;
const searchOf = (row: LeadQualityConfig) => `${row.version} ${row.status} ${row.published_by?.name ?? ''} ${row.change_note}`;

interface Props {
  leadType: CrmLeadEntityType;
  busy: boolean;
  onRestore: (version: number) => void;
}

/** Every version of the lead type's scoring model, newest first; any of them can become the draft again. */
export default function VersionHistoryTable({ leadType, busy, onRestore }: Readonly<Props>) {
  const { t } = useTranslation();
  const headingId = useId();
  const { data, loading, error } = useQuery<{ crmLeadQualityVersions: LeadQualityConfig[] }, QueryCrmLeadQualityVersionsArgs>(LEAD_QUALITY_VERSIONS, {
    variables: { lead_type: leadType },
    fetchPolicy: 'cache-and-network',
  });
  const columns = useMemo(() => versionColumns(t, busy, onRestore), [t, busy, onRestore]);
  const rows = data?.crmLeadQualityVersions;
  const fetchRows = useMemo(() => clientTableFetch(rows ?? [], searchOf, columns), [rows, columns]);

  return (
    <Stack component="section" spacing={1} aria-labelledby={headingId} data-testid="lead-quality-versions">
      <Typography id={headingId} variant="h6" component="h2" sx={{ fontWeight: 700 }}>
        {t('crm.leadQualitySettings.versionsTitle')}
      </Typography>
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      <DuncitTable<LeadQualityConfig>
        tableId="crm-lead-quality-versions"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        defaultSort={{ field: 'version', dir: 'desc' }}
        searchPlaceholder={t('crm.leadQualitySettings.versionsSearch')}
        emptyText={t(loading ? 'crm.leadQualitySettings.loading' : 'crm.leadQualitySettings.versionsEmpty')}
        ariaLabel={t('crm.leadQualitySettings.versionsTitle')}
      />
    </Stack>
  );
}
