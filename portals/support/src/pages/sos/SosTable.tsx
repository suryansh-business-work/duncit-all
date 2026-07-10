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
import type { SosAlert } from '../../graphql/bouncer';

const STATUS_COLOR: Record<SosAlert['status'], 'error' | 'warning' | 'success'> = {
  ACTIVE: 'error',
  ACKNOWLEDGED: 'warning',
  RESOLVED: 'success',
};

// Only fields the server whitelists (BOUNCER_SORTABLE) are sortable.
const COLS: { field: string; label: string; sortable: boolean }[] = [
  { field: 'ticket_no', label: 'ID', sortable: false },
  { field: 'user', label: 'User', sortable: false },
  { field: 'pod', label: 'Pod', sortable: false },
  { field: 'phone', label: 'Phone', sortable: false },
  { field: 'status', label: 'Status', sortable: true },
  { field: 'created_at', label: 'Raised', sortable: true },
];

interface Props {
  alerts: SosAlert[];
  total: number;
  loading: boolean;
  emptyLabel: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onSort: (field: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRowClick: (id: string) => void;
}

export default function SosTable({
  alerts,
  total,
  loading,
  emptyLabel,
  page,
  pageSize,
  sortBy,
  sortDir,
  onSort,
  onPageChange,
  onPageSizeChange,
  onRowClick,
}: Readonly<Props>) {
  if (loading && !alerts.length) {
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
          {alerts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLS.length}>
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  {emptyLabel}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            alerts.map((a) => (
              <TableRow key={a.id} hover sx={{ cursor: 'pointer' }} onClick={() => onRowClick(a.id)}>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{a.ticket_no}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{a.user.name}</TableCell>
                <TableCell>
                  {a.pod.title}
                  {a.pod.venue_name ? ` · ${a.pod.venue_name}` : ''}
                </TableCell>
                <TableCell>{a.contact_phone || '—'}</TableCell>
                <TableCell>
                  <Chip size="small" color={STATUS_COLOR[a.status]} label={a.status} />
                </TableCell>
                <TableCell>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</TableCell>
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
