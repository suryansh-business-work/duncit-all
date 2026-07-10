import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Stack, TextField, Typography } from '@mui/material';
import {
  BOUNCER_CALLBACK_REQUESTS,
  type CallbackRequest,
  type CallbackRequestPage,
} from '../../graphql/bouncer';
import { useSupportSocket } from '../../lib/useSupportSocket';
import StatusFilter, { type StatusOption } from '../../components/StatusFilter';
import CallbacksTable from './CallbacksTable';

type CallbackFilter = CallbackRequest['status'] | 'ALL';

// "Resolved" is the user-facing label for the backend CLOSED status.
const FILTER_OPTIONS: ReadonlyArray<StatusOption<CallbackRequest['status']>> = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'CLOSED', label: 'Resolved' },
];

export default function CallbacksListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<CallbackFilter>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, loading, refetch } = useQuery<{ bouncerCallbackRequests: CallbackRequestPage }>(
    BOUNCER_CALLBACK_REQUESTS,
    {
      variables: {
        status: filter === 'ALL' ? null : filter,
        search: search || null,
        page: page + 1,
        page_size: pageSize,
        sort_by: sortBy,
        sort_dir: sortDir,
      },
      fetchPolicy: 'cache-and-network',
    }
  );

  useSupportSocket({
    onCallback: () => refetch(),
    onCallbackUpdate: () => refetch(),
  });

  const items = data?.bouncerCallbackRequests.items ?? [];
  const total = data?.bouncerCallbackRequests.total ?? 0;

  const onSort = (field: string) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(0);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} flexWrap="wrap">
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Callback Requests
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Users who asked for a call back. Open one to mark it contacted or close it.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            label="Search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <StatusFilter
            value={filter}
            options={FILTER_OPTIONS}
            onChange={(v) => {
              setFilter(v);
              setPage(0);
            }}
          />
        </Stack>
      </Stack>
      <CallbacksTable
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
        onRowClick={(id) => navigate(`/callbacks/${id}`)}
      />
    </Stack>
  );
}
