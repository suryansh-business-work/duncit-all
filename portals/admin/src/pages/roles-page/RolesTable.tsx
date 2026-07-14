import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, IconButton, Link, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { format } from 'date-fns';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { portalForRole } from '../../constants/portalAccess';
import type { RoleRow } from './queries';

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

const renderType = (r: RoleRow) =>
  r.is_system ? (
    <Chip size="small" label="System" color="info" />
  ) : (
    <Chip size="small" label="Custom" />
  );

const createdValue = (r: RoleRow) =>
  r.created_at ? format(new Date(r.created_at), 'd MMM yyyy') : '—';

export default function RolesTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<RoleRow>[]>(() => {
    const renderActions = (r: RoleRow) => (
      <Stack direction="row" justifyContent="flex-end" component="span">
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(r)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={r.is_system ? 'System (locked)' : 'Delete'}>
          <span>
            <IconButton size="small" disabled={r.is_system} onClick={() => onDelete(r)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    );
    return [
      { field: 'key', headerName: 'Key', minWidth: 180, cellRenderer: renderKey, valueGetter: (r) => r.key },
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
      {
        field: 'portal',
        headerName: 'Portal',
        sortable: false,
        minWidth: 160,
        cellRenderer: renderPortal,
        valueGetter: portalValue,
      },
      {
        field: 'description',
        headerName: 'Description',
        sortable: false,
        flex: 1,
        minWidth: 200,
        valueGetter: (r) => r.description || '—',
      },
      {
        field: 'is_system',
        headerName: 'Type',
        filter: { type: 'boolean' },
        width: 110,
        cellRenderer: renderType,
        valueGetter: (r) => (r.is_system ? 'System' : 'Custom'),
      },
      {
        field: 'created_at',
        headerName: 'Created',
        filter: { type: 'date' },
        hide: true,
        width: 130,
        valueGetter: createdValue,
      },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 110, cellRenderer: renderActions },
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
