import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, Link, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitTable, actionsColumn, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { portalForRole } from '../../constants/portalAccess';
import type { RoleRow } from './queries';
import { useTranslation } from '@duncit/shell';

interface Props {
  fetchRows: TableFetch<RoleRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (r: RoleRow) => void;
  onDelete: (r: RoleRow) => void;
}

const getRoleRowId = (r: RoleRow) => r.id;

const renderKey = (r: RoleRow) => (
  <Typography variant="body2" fontWeight={600} component="span">
    {r.key}
  </Typography>
);

const renderPortal = (r: RoleRow) => {
  const portal = portalForRole(r.key);
  if (!portal) {
    return (
      <Typography variant="body2" color="text.secondary" component="span">
        —
      </Typography>
    );
  }
  return (
    <Link
      href={portal.url}
      target="_blank"
      rel="noopener"
      underline="hover"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: 13 }}
    >
      {portal.portalName}
      <OpenInNewIcon sx={{ fontSize: 14 }} />
    </Link>
  );
};

const portalValue = (r: RoleRow) => portalForRole(r.key)?.portalName ?? '—';

type Translate = ReturnType<typeof useTranslation>['t'];

const renderType = (r: RoleRow, t: Translate) =>
  r.is_system ? (
    <Chip size="small" label={t('admin.roles.system')} color="info" />
  ) : (
    <Chip size="small" label={t('admin.roles.custom')} />
  );

export default function RolesTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<RoleRow>[]>(() => {
    return [
      { field: 'key', headerName: t('admin.roles.key'), minWidth: 180, cellRenderer: renderKey, valueGetter: (r) => r.key },
      { field: 'name', headerName: t('shell.common.name'), flex: 1, minWidth: 160 },
      {
        field: 'portal',
        headerName: t('admin.roles.portal'),
        sortable: false,
        minWidth: 160,
        cellRenderer: renderPortal,
        valueGetter: portalValue,
      },
      {
        field: 'description',
        headerName: t('shell.common.description'),
        flex: 1,
        minWidth: 200,
        valueGetter: (r) => r.description || '—',
      },
      {
        field: 'is_system',
        headerName: t('admin.roles.type'),
        filter: { type: 'boolean' },
        width: 110,
        cellRenderer: (row: RoleRow) => renderType(row, t),
        valueGetter: (r) => (r.is_system ? 'System' : 'Custom'),
      },
      dateColumn<RoleRow>(),
      actionsColumn<RoleRow>({
        onEdit,
        onDelete,
        delete: { color: 'default', disabled: (r) => r.is_system, disabledTitle: 'System (locked)' },
      }),
    ];
  }, [onEdit, onDelete]);

  return (
    <DuncitTable<RoleRow>
      tableId="admin-roles"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRoleRowId}
      toolbarActions={toolbarActions}
      emptyText='No roles yet. Click "New Role" to create the first one.'
      defaultSort={{ field: 'key', dir: 'asc' }}
      searchPlaceholder="Search key, name or description"
      refetchRef={refetchRef}
    />
  );
}
