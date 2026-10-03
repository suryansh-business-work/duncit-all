import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '../../i18n/useTranslation';
import { brandLogColumns } from './columns';
import { BRAND_CHANGE_LOGS_TABLE, type BrandChangeLogRow } from './queries';

export interface BrandLogsPanelProps {
  /** The brand's document id. */
  brandId: string;
  /** Table id for column/filter persistence — one per portal. */
  tableId: string;
}

const getRowId = (row: BrandChangeLogRow) => row.id;

/**
 * A brand's activity log: one row per changed field, whoever changed it and
 * wherever from. The server appends and never rewrites, so this is the whole
 * history. The brand owner (Partners) and staff (Products) mount the same panel;
 * the server decides which brands each may read.
 */
export function BrandLogsPanel({ brandId, tableId }: Readonly<BrandLogsPanelProps>) {
  const { t } = useTranslation();
  const client = useApolloClient();

  const fetchRows = useApolloTableFetch<BrandChangeLogRow>(
    client,
    BRAND_CHANGE_LOGS_TABLE,
    'entityChangeLogsTable',
    { extraVariables: { entity_type: 'BRAND', entity_id: brandId } },
    [brandId],
  );

  const columns = useMemo(() => brandLogColumns(t), [t]);

  return (
    <Stack spacing={2} data-testid="brand-logs-panel">
      <Stack spacing={0.25}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 'fontWeightBold' }}>
          {t('shell.brandConsole.logsTitle')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('shell.brandConsole.logsSubtitle')}
        </Typography>
      </Stack>
      <DuncitTable<BrandChangeLogRow>
        ariaLabel={t('shell.brandConsole.logsTitle')}
        tableId={tableId}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText={t('shell.brandConsole.logsEmpty')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder={t('shell.brandConsole.logsSearch')}
      />
    </Stack>
  );
}
