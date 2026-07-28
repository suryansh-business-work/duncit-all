import GroupsIcon from '@mui/icons-material/Groups';
import PaymentsIcon from '@mui/icons-material/Payments';
import StorageIcon from '@mui/icons-material/Storage';
import { Stack } from '@mui/material';
import { StatCard } from '@duncit/ui';
import { formatINR } from '@duncit/utils';

/** One tile per StatCard layout, with the numbers a real dashboard shows. */
export function DashboardTiles() {
  return (
    <Stack direction="row" flexWrap="wrap" sx={{ gap: 2 }}>
      <StatCard
        label="Disk usage"
        value="205 GB"
        sub="of 250 GB"
        percent={82}
        icon={<StorageIcon fontSize="small" />}
        iconColor="text.secondary"
        sx={{ flex: '1 1 220px' }}
      />
      <StatCard
        layout="valueFirst"
        label="Pods completed"
        value="1,284"
        icon={<GroupsIcon />}
        iconBox={{ color: '#7c3aed' }}
        sx={{ flex: '1 1 220px' }}
      />
      <StatCard
        layout="split"
        label="Host payouts — July"
        value={formatINR(482150)}
        hint="+12% vs June"
        hintColor="success.main"
        icon={<PaymentsIcon />}
        iconBox={{ color: '#0ea5e9', size: 44 }}
        sx={{ flex: '1 1 220px' }}
      />
    </Stack>
  );
}
