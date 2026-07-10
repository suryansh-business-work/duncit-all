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
import type { Ticket, TicketPriority, TicketStatus } from '../../../graphql/tickets';

const STATUS_COLOR: Record<TicketStatus, 'primary' | 'warning' | 'success' | 'default'> = {
  OPEN: 'primary',
  PENDING: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
};

const PRIORITY_COLOR: Record<TicketPriority, 'error' | 'warning' | 'default'> = {
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'default',
};

// Only fields the server whitelists (TICKET_SORTABLE) are sortable.
const COLS: { field: string; label: string; sortable: boolean }[] = [
  { field: 'ticket_no', label: 'Ticket ID', sortable: false },
  { field: 'subject', label: 'Subject', sortable: true },
  { field: 'user', label: 'User', sortable: false },
  { field: 'category', label: 'Category', sortable: false },
  { field: 'status', label: 'Status', sortable: true },
  { field: 'priority', label: 'Priority', sortable: true },
  { field: 'last_message_at', label: 'Last activity', sortable: true },
];

interface Props {
  items: Ticket[];
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

export default function TicketsTable({
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
                  No tickets here yet.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            items.map((t) => (
              <TableRow key={t.id} hover sx={{ cursor: 'pointer' }} onClick={() => onRowClick(t.id)}>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {t.ticket_no}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t.subject}</TableCell>
                <TableCell>{t.user.name}</TableCell>
                <TableCell>{t.category}</TableCell>
                <TableCell>
                  <Chip size="small" color={STATUS_COLOR[t.status]} label={t.status} />
                </TableCell>
                <TableCell>
                  <Chip size="small" color={PRIORITY_COLOR[t.priority]} label={t.priority} />
                </TableCell>
                <TableCell>{formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}</TableCell>
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
