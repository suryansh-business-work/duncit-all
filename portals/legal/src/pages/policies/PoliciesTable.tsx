import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { Policy } from '../../graphql/policies';

interface Props {
  fetchRows: TableFetch<Policy>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (p: Policy) => void;
  onRemove: (p: Policy) => void;
}

const getPolicyRowId = (p: Policy) => p.id;

const renderTitle = (p: Policy) => (
  <Typography variant="body2" fontWeight={700} component="span">
    {p.title}
  </Typography>
);

const renderStatus = (p: Policy) => (
  <Chip size="small" color={p.is_active ? 'success' : 'default'} label={p.is_active ? 'Active' : 'Hidden'} />
);

const statusValue = (p: Policy) => (p.is_active ? 'Active' : 'Hidden');

export default function PoliciesTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onRemove,
}: Readonly<Props>) {
  // Only server-allowlisted fields are sortable/filterable (POLICY_TABLE_CONFIG):
  // sort title/slug/sort_order/is_active/created_at/updated_at; filter is_active
  // (boolean), slug (text), sort_order (number), created_at/updated_at (date).
  const columns = useMemo<DuncitColumn<Policy>[]>(() => {
    const renderActions = (p: Policy) => (
      <Stack direction="row" spacing={1} justifyContent="flex-end" component="span">
        <Button size="small" onClick={() => onEdit(p)}>
          Edit
        </Button>
        <Button size="small" color="error" onClick={() => onRemove(p)}>
          Delete
        </Button>
      </Stack>
    );
    return [
      { field: 'title', headerName: 'Title', flex: 1, minWidth: 200, cellRenderer: renderTitle },
      { field: 'slug', headerName: 'Slug', minWidth: 180, filter: { type: 'text' } },
      {
        field: 'is_active',
        headerName: 'Status',
        width: 110,
        filter: { type: 'boolean' },
        cellRenderer: renderStatus,
        valueGetter: statusValue,
      },
      { field: 'sort_order', headerName: 'Sort', width: 90, filter: { type: 'number' } },
      // Hidden by default — carries the allowlisted updated-date filter.
      { field: 'updated_at', headerName: 'Updated', hide: true, filter: { type: 'date' }, minWidth: 150 },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 160, cellRenderer: renderActions },
    ];
  }, [onEdit, onRemove]);

  return (
    <DuncitTable<Policy>
      tableId="legal-policies"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPolicyRowId}
      toolbarActions={toolbarActions}
      emptyText="No policies yet."
      defaultSort={{ field: 'sort_order', dir: 'asc' }}
      searchPlaceholder="Search title or slug"
      refetchRef={refetchRef}
    />
  );
}
