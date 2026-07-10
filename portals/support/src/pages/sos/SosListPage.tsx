import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Stack, TextField, Typography } from '@mui/material';
import { BOUNCER_SOS_ALERTS, type SosAlert, type SosAlertPage } from '../../graphql/bouncer';
import { useSupportSocket } from '../../lib/useSupportSocket';
import StatusFilter, { type StatusOption } from '../../components/StatusFilter';
import SosTable from './SosTable';

type SosFilter = SosAlert['status'] | 'ALL';

// "Active" groups the open ACTIVE + ACKNOWLEDGED states; "Resolved" = RESOLVED.
const FILTER_OPTIONS: ReadonlyArray<StatusOption<SosAlert['status']>> = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'RESOLVED', label: 'Resolved' },
];

export default function SosListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<SosFilter>('ALL');
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

  const { data, loading, refetch } = useQuery<{ bouncerSosAlerts: SosAlertPage }>(BOUNCER_SOS_ALERTS, {
    variables: {
      status: filter === 'ALL' ? null : filter,
      search: search || null,
      page: page + 1,
      page_size: pageSize,
      sort_by: sortBy,
      sort_dir: sortDir,
    },
    fetchPolicy: 'cache-and-network',
  });

  useSupportSocket({
    onSos: () => refetch(),
    onSosUpdate: () => refetch(),
  });

  const alerts = data?.bouncerSosAlerts.items ?? [];
  const total = data?.bouncerSosAlerts.total ?? 0;

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
            SOS Alerts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Live safety alerts raised by users. Open one to acknowledge or resolve it.
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
      <SosTable
        alerts={alerts}
        total={total}
        loading={loading}
        emptyLabel={filter === 'ACTIVE' ? 'No Active SOS Alerts Found' : 'No SOS Alerts Found'}
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
        onRowClick={(id) => navigate(`/sos/${id}`)}
      />
    </Stack>
  );
}
