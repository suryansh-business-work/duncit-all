import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import HistoryIcon from '@mui/icons-material/History';
import MailOutlineIcon from '@mui/icons-material/MailOutlined';
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
  // Only server-allowlisted fields are sortable/filterable (POLICY_TABLE_CONFIG):
  // sort policy_no/title/slug/policy_type/sort_order/is_active/created_at/updated_at; filter
  // is_active (boolean), policy_no + slug + policy_type (text), sort_order (number),
  // created_at/updated_at (date).
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
          <IconButton size="small" aria-label={t('legal.policies.versions.action')} onClick={() => onHistory(p)}>
            <HistoryIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('legal.policies.notify.sendNowHint')}>
          <IconButton size="small" aria-label={t('legal.policies.notify.sendNow')} onClick={() => onNotify(p)}>
            <MailOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Button size="small" onClick={() => onEdit(p)}>
          {t('shell.common.edit')}
        </Button>
        <Button size="small" color="error" onClick={() => onRemove(p)}>
          {t('shell.common.delete')}
        </Button>
      </Stack>
    );
    return [
      entityIdColumn<Policy>({ field: 'policy_no', headerName: t('legal.policies.colId') }),
      { field: 'title', headerName: t('shell.common.title'), flex: 1, minWidth: 200, cellRenderer: renderTitle },
      { field: 'slug', headerName: t('legal.policies.colSlug'), minWidth: 180, filter: { type: 'text' } },
      {
        field: 'policy_type',
        headerName: t('legal.policies.colPolicyType'),
        minWidth: 180,
        filter: { type: 'text' },
        valueGetter: (p) => p.policy_type || '—',
      },
      {
        field: 'is_active',
        headerName: t('shell.common.status'),
        width: 110,
        filter: { type: 'boolean' },
        cellRenderer: renderStatus,
        valueGetter: activeLabel,
      },
      // Computed from the stored history, so it is not sortable server-side.
      {
        field: 'version_count',
        headerName: t('legal.policies.colVersions'),
        sortable: false,
        width: 100,
      },
      { field: 'sort_order', headerName: t('legal.policies.colSort'), width: 90, filter: { type: 'number' } },
      // Hidden by default — carries the allowlisted updated-date filter.
      { field: 'updated_at', headerName: t('shell.common.updated'), hide: true, filter: { type: 'date' }, minWidth: 150 },
      { field: 'actions', headerName: t('shell.common.actions'), sortable: false, width: 220, cellRenderer: renderActions },
    ];
  }, [onEdit, onRemove, onHistory, onNotify, t]);

  return (
    <DuncitTable<Policy>
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
