import GroupsIcon from '@mui/icons-material/Groups';
import PaymentsIcon from '@mui/icons-material/Payments';
import StorageIcon from '@mui/icons-material/Storage';
import { Paper, Stack } from '@mui/material';
import { InfoRow, PageHeader, StatCard, StatusChip } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import { defineDemo, defineDemos } from '../types';

interface TilesMock {
  disk_used_gb: number;
  disk_total_gb: number;
  pods_completed: number;
  host_payouts: number;
}

interface RowsMock {
  pod_id: string;
  venue: string;
  spots: string;
  total: number;
  statuses: string[];
}

export default defineDemos('ui', [
  defineDemo<TilesMock>({
    id: 'stat-cards',
    title: 'StatCard — the three layouts a dashboard uses',
    note: 'One tile per layout, with the numbers a real dashboard shows. Edit the mock to see the percent ring move.',
    mock: { disk_used_gb: 205, disk_total_gb: 250, pods_completed: 1284, host_payouts: 482150 },
    render: (mock) => (
      <Stack direction="row" flexWrap="wrap" sx={{ gap: 2 }}>
        <StatCard
          label="Disk usage"
          value={`${mock.disk_used_gb} GB`}
          sub={`of ${mock.disk_total_gb} GB`}
          percent={Math.round((mock.disk_used_gb / mock.disk_total_gb) * 100)}
          icon={<StorageIcon fontSize="small" />}
          iconColor="text.secondary"
          sx={{ flex: '1 1 220px' }}
        />
        <StatCard
          layout="valueFirst"
          label="Pods completed"
          value={mock.pods_completed.toLocaleString('en-IN')}
          icon={<GroupsIcon />}
          iconBox={{ color: '#7c3aed' }}
          sx={{ flex: '1 1 220px' }}
        />
        <StatCard
          layout="split"
          label="Host payouts — July"
          value={formatMoney(mock.host_payouts)}
          hint="+12% vs June"
          hintColor="success.main"
          icon={<PaymentsIcon />}
          iconBox={{ color: '#0ea5e9', size: 44 }}
          sx={{ flex: '1 1 220px' }}
        />
      </Stack>
    ),
  }),

  defineDemo<RowsMock>({
    id: 'rows-and-chips',
    title: 'PageHeader, InfoRow and StatusChip',
    note:
      'StatusChip resolves its colour from a shared status map, so PENDING is the same amber in Finance as it is in Admin.',
    mock: {
      pod_id: 'DUN-POD-4821',
      venue: 'Play Arena, HSR Layout',
      spots: '7 of 8 taken',
      total: 3150,
      statuses: ['ACTIVE', 'PENDING', 'CANCELLED', 'COMPLETED', 'REFUNDED'],
    },
    render: (mock) => (
      <Stack spacing={2}>
        <PageHeader title="Pod detail" subtitle={mock.pod_id} />
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <InfoRow label="Venue" value={mock.venue} />
          <InfoRow label="Spots" value={mock.spots} />
          <InfoRow variant="split" bold label="Collected" value={formatMoney(mock.total)} />
        </Paper>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {mock.statuses.map((status) => (
            <StatusChip key={status} status={status} />
          ))}
        </Stack>
      </Stack>
    ),
  }),
]);
