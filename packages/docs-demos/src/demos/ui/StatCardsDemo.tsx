import GroupsIcon from '@mui/icons-material/Groups';
import PaymentsIcon from '@mui/icons-material/Payments';
import StorageIcon from '@mui/icons-material/Storage';
import { Stack } from '@mui/material';
import { StatCard } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';

export interface TilesMock {
  disk_used_gb: number;
  disk_total_gb: number;
  pods_completed: number;
  host_payouts: number;
}

/** One tile per layout — what the `stat-cards` demo renders. */
export function StatCardsDemo({ mock }: Readonly<{ mock: TilesMock }>) {
  return (
    <Stack
      direction="row"
      sx={{
        flexWrap: "wrap",
        gap: 2
      }}>
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
  );
}
