import { Chip } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { formatDateTime } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { EM_DASH, type DuncitColumn } from '@duncit/table';
import type { useTranslation } from '@duncit/shell';
import type { LeadQualityConfig } from '../../api/leadQuality.gql';
import { CONFIG_STATUS_COLOR, CONFIG_STATUS_KEY } from './configStatus';

type Translate = ReturnType<typeof useTranslation>['t'];

/** The version history's columns: which version, its status and total, who published it, why, and Restore. */
export function versionColumns(t: Translate, busy: boolean, onRestore: (version: number) => void): DuncitColumn<LeadQualityConfig>[] {
  return [
    { field: 'version', headerName: t('crm.leadQualitySettings.colVersion'), type: 'number', width: 110, valueGetter: (row) => row.version },
    {
      field: 'status',
      headerName: t('crm.leadQualitySettings.colStatus'),
      type: 'enum',
      options: (['PUBLISHED', 'DRAFT', 'ARCHIVED'] as const).map((status) => ({ value: status, label: t(CONFIG_STATUS_KEY[status]) })),
      width: 140,
      valueGetter: (row) => t(CONFIG_STATUS_KEY[row.status]),
      cellRenderer: (row) => <Chip size="small" color={CONFIG_STATUS_COLOR[row.status]} label={t(CONFIG_STATUS_KEY[row.status])} />,
    },
    {
      field: 'weightage_total',
      headerName: t('crm.leadQualitySettings.colTotal'),
      type: 'number',
      width: 130,
      valueGetter: (row) => t('crm.leadQualitySettings.percent', { vars: { total: row.weightage_total } }),
    },
    {
      field: 'published_by.name',
      headerName: t('crm.leadQualitySettings.colPublishedBy'),
      type: 'text',
      width: 170,
      valueGetter: (row) => row.published_by?.name || EM_DASH,
    },
    {
      field: 'published_at',
      headerName: t('crm.leadQualitySettings.colPublishedAt'),
      type: 'date',
      width: 190,
      valueGetter: (row) => (row.published_at ? formatDateTime(row.published_at) : EM_DASH),
    },
    { field: 'change_note', headerName: t('crm.leadQualitySettings.colNote'), type: 'text', flex: 1, minWidth: 200, valueGetter: (row) => row.change_note || EM_DASH },
    {
      field: 'actions',
      headerName: t('shell.common.actions'),
      type: 'actions',
      width: 190,
      cellRenderer: (row) => (
        <DuncitButton
          size="small"
          startIcon={<RestoreIcon fontSize="small" />}
          disabled={busy || row.status === 'DRAFT'}
          onClick={() => onRestore(row.version)}
          aria-label={t('crm.leadQualitySettings.restoreNamed', { vars: { version: row.version } })}
          data-testid={`lead-quality-restore-${row.version}`}
        >
          {t('crm.leadQualitySettings.restore')}
        </DuncitButton>
      ),
    },
  ];
}
