import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';

/** Row shape shared by the App FAQs and Partner FAQs tables (one server entity). */
export interface FaqRow {
  id: string;
  audience?: string | null;
  partner_topic?: string | null;
  super_category_id?: string | null;
  super_category?: { id: string; name: string } | null;
  question: string;
  answer: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string | null;
}

interface Props {
  tableId: string;
  fetchRows: TableFetch<FaqRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  /** The per-audience column: Super Category (APP) or Topic (PARTNERS). */
  entityColumn: DuncitColumn<FaqRow>;
  toolbarActions?: ReactNode;
  emptyText: string;
  onEdit: (row: FaqRow) => void;
  onDelete: (row: FaqRow) => void;
}

const getFaqRowId = (row: FaqRow) => row.id;

const renderQuestion = (row: FaqRow) => (
  <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={600} noWrap component="div">
      {row.question}
    </Typography>
    <Typography variant="caption" color="text.secondary" noWrap component="div">
      {row.answer}
    </Typography>
  </Box>
);

const renderActive = (row: FaqRow) => (
  <Chip
    size="small"
    color={row.is_active ? 'success' : 'default'}
    label={row.is_active ? 'Active' : 'Hidden'}
  />
);

const createdValue = (row: FaqRow) =>
  row.created_at ? format(new Date(row.created_at), 'd MMM yyyy') : '—';

/** One DuncitTable config serving both FAQ audiences — pages pin the audience
 * filter inside fetchRows and provide their own category/topic column. */
export default function FaqsTableBase({
  tableId,
  fetchRows,
  refetchRef,
  entityColumn,
  toolbarActions,
  emptyText,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<FaqRow>[]>(() => {
    const renderActions = (row: FaqRow) => (
      <Stack direction="row" justifyContent="flex-end" component="span">
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(row)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => onDelete(row)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    );
    return [
      {
        field: 'question',
        headerName: 'Question',
        flex: 1.6,
        minWidth: 280,
        cellRenderer: renderQuestion,
        valueGetter: (row) => row.question,
      },
      entityColumn,
      { field: 'sort_order', headerName: 'Sort', filter: { type: 'number' }, width: 90 },
      {
        field: 'is_active',
        headerName: 'Active',
        filter: { type: 'boolean' },
        width: 110,
        cellRenderer: renderActive,
        valueGetter: (row) => (row.is_active ? 'Active' : 'Hidden'),
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
  }, [entityColumn, onEdit, onDelete]);

  return (
    <DuncitTable<FaqRow>
      tableId={tableId}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getFaqRowId}
      toolbarActions={toolbarActions}
      emptyText={emptyText}
      defaultSort={{ field: 'sort_order', dir: 'asc' }}
      searchPlaceholder="Search question or answer"
      refetchRef={refetchRef}
    />
  );
}
