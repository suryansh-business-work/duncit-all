import {
  Box,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import type { CallbackRequest } from '../../graphql/bouncer';

const STATUS_COLOR: Record<CallbackRequest['status'], 'warning' | 'primary' | 'default'> = {
  PENDING: 'warning',
  CONTACTED: 'primary',
  CLOSED: 'default',
};

// Only fields the server whitelists (BOUNCER_SORTABLE) are sortable.
const COLS: { field: string; label: string; sortable: boolean }[] = [
  { field: 'ticket_no', label: 'ID', sortable: false },
  { field: 'user', label: 'User', sortable: false },
  { field: 'phone', label: 'Phone', sortable: false },
  { field: 'pod', label: 'Pod', sortable: false },
  { field: 'status', label: 'Status', sortable: true },
  { field: 'created_at', label: 'Requested', sortable: true },
];

interface Props {
  items: CallbackRequest[];
  total: number;
  loading: boolean;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onSort: (field: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRowClick: (id: string) => void;
}

export default function CallbacksTable({
  items,
  total,
  loading,
  page,
  pageSize,
  sortBy,
  sortDir,
  onSort,
  onPageChange,
  onPageSizeChange,
  onRowClick,
}: Readonly<Props>) {
  if (loading && !items.length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  return (
    <Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            {COLS.map((c) => (
              <TableCell key={c.field} sortDirection={sortBy === c.field ? sortDir : false}>
                {c.sortable ? (
                  <TableSortLabel
                    active={sortBy === c.field}
                    direction={sortBy === c.field ? sortDir : 'asc'}
                    onClick={() => onSort(c.field)}
                  >
                    {c.label}
                  </TableSortLabel>
                ) : (
                  c.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLS.length}>
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  No Callback Requests Found
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            items.map((req) => (
              <TableRow key={req.id} hover sx={{ cursor: 'pointer' }} onClick={() => onRowClick(req.id)}>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{req.ticket_no}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{req.user.name}</TableCell>
                <TableCell>{req.contact_phone || '—'}</TableCell>
                <TableCell>{req.pod?.title ?? '—'}</TableCell>
                <TableCell>
                  <Chip size="small" color={STATUS_COLOR[req.status]} label={req.status} />
                </TableCell>
                <TableCell>{formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_e, p) => onPageChange(p)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(e) => onPageSizeChange(Number.parseInt(e.target.value, 10))}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </Box>
  );
}
