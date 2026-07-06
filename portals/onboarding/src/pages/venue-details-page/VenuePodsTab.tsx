import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  Alert,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import TableSkeleton from '../../components/TableSkeleton';
import { useDateFormat } from '../../utils/dateFormat';
import { podBucket, type PodBucket } from '../../utils/podBucket';
import { VENUE_PODS, type VenuePod } from './queries';

const APPROVAL_COLOR: Record<VenuePod['venue_approval_status'], 'default' | 'warning' | 'success' | 'error'> = {
  NONE: 'default',
  PENDING: 'warning',
  APPROVED: 'success',
  DECLINED: 'error',
};

type PodFilter = 'all' | PodBucket;
const FILTERS: { value: PodFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'hosted', label: 'Hosted' },
];

function ActiveChip({ active }: Readonly<{ active: boolean }>) {
  return (
    <Chip size="small" variant="outlined" color={active ? 'success' : 'default'} label={active ? 'Live' : 'Offline'} />
  );
}

export default function VenuePodsTab({ venueId }: Readonly<{ venueId: string }>) {
  const { formatDateTime } = useDateFormat();
  const [filter, setFilter] = useState<PodFilter>('all');
  const { data, loading, error } = useQuery<{ pods: VenuePod[] }>(VENUE_PODS, {
    variables: { venue_id: venueId },
    fetchPolicy: 'cache-and-network',
    skip: !venueId,
  });

  const pods = useMemo(() => data?.pods ?? [], [data]);
  const shown = useMemo(
    () => (filter === 'all' ? pods : pods.filter((pod) => podBucket(pod) === filter)),
    [pods, filter],
  );

  if (loading && !data) return <TableSkeleton columns={6} />;
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    <Stack spacing={1.5}>
      <Stack spacing={0.25}>
        <Typography variant="h6" fontWeight={900}>
          Pods at this venue
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Every pod hosted here — live and upcoming. Deactivating or deleting the venue is blocked while pods are attached.
        </Typography>
      </Stack>

      <ToggleButtonGroup
        size="small"
        exclusive
        value={filter}
        onChange={(_e, next) => next && setFilter(next)}
        sx={{ alignSelf: 'flex-start' }}
      >
        {FILTERS.map((f) => (
          <ToggleButton key={f.value} value={f.value} sx={{ textTransform: 'none' }}>
            {f.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Pod</TableCell>
            <TableCell>Date &amp; time</TableCell>
            <TableCell>Host(s)</TableCell>
            <TableCell>Mode</TableCell>
            <TableCell>Venue approval</TableCell>
            <TableCell align="right">Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {shown.map((pod) => (
            <TableRow key={pod.id} hover>
              <TableCell>
                <Typography variant="body2" fontWeight={700}>{pod.pod_title}</Typography>
                <Typography variant="caption" color="text.secondary">{pod.club_slug || '—'}</Typography>
              </TableCell>
              <TableCell>{formatDateTime(pod.pod_date_time) || '—'}</TableCell>
              <TableCell>{pod.host_names.join(', ') || '—'}</TableCell>
              <TableCell><Chip size="small" variant="outlined" label={pod.pod_mode} /></TableCell>
              <TableCell>
                <Chip size="small" color={APPROVAL_COLOR[pod.venue_approval_status]} label={pod.venue_approval_status} />
              </TableCell>
              <TableCell align="right"><ActiveChip active={pod.is_active} /></TableCell>
            </TableRow>
          ))}
          {shown.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center">No pods in this view.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Stack>
  );
}
