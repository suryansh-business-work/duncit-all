import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import HistoryIcon from '@mui/icons-material/History';
import MailOutlineIcon from '@mui/icons-material/MailOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { DuncitTable, entityIdColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { Policy } from '../../graphql/policies';
import { useTranslation } from '@duncit/shell';

interface Props {
  fetchRows: TableFetch<Policy>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (p: Policy) => void;
  onRemove: (p: Policy) => void;
  /** Open every wording this policy has had. */
  onHistory: (p: Policy) => void;
  /** Email everyone who has accepted it, without editing anything. */
  onNotify: (p: Policy) => void;
}

const getPolicyRowId = (p: Policy) => p.id;

const renderTitle = (p: Policy) => (
  <Typography variant="body2" component="span" sx={{
    fontWeight: 700
  }}>
    {p.title}
  </Typography>
);

export default function PoliciesTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onRemove,
  onHistory,
  onNotify,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // Sort and filter keys are allowlisted on the server (POLICY_TABLE_CONFIG).
  const columns = useMemo<DuncitColumn<Policy>[]>(() => {
    const activeLabel = (p: Policy) =>
      p.is_active ? t('shell.common.active') : t('legal.policies.hidden');
    const renderStatus = (p: Policy) => (
      <Chip size="small" color={p.is_active ? 'success' : 'default'} label={activeLabel(p)} />
    );
    const renderActions = (p: Policy) => (
      <Stack direction="row" spacing={0.5} component="span" sx={{
        justifyContent: "flex-end"
      }}>
        <Tooltip title={t('legal.policies.versions.action')}>
          <DuncitIconButton size="small" aria-label={t('legal.policies.versions.action')} onClick={() => onHistory(p)}>
            <HistoryIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
        <Tooltip title={t('legal.policies.notify.sendNowHint')}>
          <DuncitIconButton size="small" aria-label={t('legal.policies.notify.sendNow')} onClick={() => onNotify(p)}>
            <MailOutlineIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
        <DuncitButton size="small" onClick={() => onEdit(p)}>
          {t('shell.common.edit')}
        </DuncitButton>
        <DuncitButton size="small" color="error" onClick={() => onRemove(p)}>
          {t('shell.common.delete')}
        </DuncitButton>
      </Stack>
    );
    return [
      entityIdColumn<Policy>({ field: 'policy_no', headerName: t('legal.policies.colId') }),
      { field: 'title', headerName: t('shell.common.title'), type: 'text', flex: 1, minWidth: 200, cellRenderer: renderTitle },
      { field: 'slug', headerName: t('legal.policies.colSlug'), minWidth: 180, type: 'text' },
      {
        field: 'policy_type',
        headerName: t('legal.policies.colPolicyType'),
        minWidth: 180,
        type: 'text',
        valueGetter: (p) => p.policy_type || '—',
      },
      {
        field: 'is_active',
        headerName: t('shell.common.status'),
        width: 110,
        type: 'boolean',
        cellRenderer: renderStatus,
        valueGetter: activeLabel,
      },
      {
        field: 'version_count',
        headerName: t('legal.policies.colVersions'),
        type: 'number',
        // Counted from the embedded history when the row is read — nothing stored to order or match on.
        sortable: false,
        filterable: false,
        width: 100,
      },
      { field: 'sort_order', headerName: t('legal.policies.colSort'), width: 90, type: 'number' },
      // Hidden by default — carries the allowlisted updated-date filter.
      { field: 'updated_at', headerName: t('shell.common.updated'), hide: true, type: 'date', minWidth: 150 },
      { field: 'actions', headerName: t('shell.common.actions'), type: 'actions', width: 220, cellRenderer: renderActions },
    ];
  }, [onEdit, onRemove, onHistory, onNotify, t]);

  return (
    <DuncitTable<Policy>
      ariaLabel={t('legal.policies.title')}
      tableId="legal-policies"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPolicyRowId}
      toolbarActions={toolbarActions}
      emptyText={t('legal.policies.empty')}
      defaultSort={{ field: 'sort_order', dir: 'asc' }}
      searchPlaceholder={t('legal.policies.search')}
      refetchRef={refetchRef}
    />
  );
}
