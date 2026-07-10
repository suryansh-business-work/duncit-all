import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { TICKETS, type TicketPage, type TicketStatus } from '../../../graphql/tickets';
import { useSupportSocket } from '../../../lib/useSupportSocket';
import TicketsTable from './TicketsTable';
import NewTicketDialog from './NewTicketDialog';

const STATUSES: TicketStatus[] = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'];

export default function TicketsListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('last_message_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, loading, refetch } = useQuery<{ tickets: TicketPage }>(TICKETS, {
    variables: {
      status: statusFilter || null,
      search: search || null,
      page: page + 1,
      page_size: pageSize,
      sort_by: sortBy,
      sort_dir: sortDir,
    },
    fetchPolicy: 'cache-and-network',
  });

  useSupportSocket({ onTicketNew: () => refetch(), onTicketUpdate: () => refetch() });

  const items = data?.tickets.items ?? [];
  const total = data?.tickets.total ?? 0;

  const onSort = (field: string) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(0);
  };

  const onCreated = (id: string | null) => {
    setOpen(false);
    if (id) navigate(`/tickets/${id}`);
    else refetch();
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} flexWrap="wrap">
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Tickets
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Support tickets from users. Open one to reply, or raise a new ticket.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            label="Search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as TicketStatus | '');
              setPage(0);
            }}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All</MenuItem>
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            New Ticket
          </Button>
        </Stack>
      </Stack>

      <TicketsTable
        items={items}
        total={total}
        loading={loading}
        page={page}
        pageSize={pageSize}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(0);
        }}
        onRowClick={(id) => navigate(`/tickets/${id}`)}
      />

      <NewTicketDialog open={open} onClose={() => setOpen(false)} onCreated={onCreated} />
    </Stack>
  );
}
