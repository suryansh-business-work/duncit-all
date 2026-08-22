import { Stack } from '@mui/material';
import { StatCard } from '@duncit/ui';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GroupsIcon from '@mui/icons-material/Groups';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HandymanIcon from '@mui/icons-material/Handyman';
import { useTranslation } from '@duncit/shell';

interface Props {
  venueCount: number;
  hostCount: number;
  totalCount: number;
  conversionRate: number;
  uniqueServices: number;
  loading?: boolean;
}

interface Tile {
  label: string;
  value: string;
  icon: JSX.Element;
  color: 'primary' | 'success' | 'info' | 'warning' | 'secondary';
}

const TILE_BG: Record<Tile['color'], string> = {
  primary: '#6366f1',
  success: '#22c55e',
  info: '#0ea5e9',
  warning: '#f59e0b',
  secondary: '#a855f7',
};

export default function KpiCards({
  venueCount,
  hostCount,
  totalCount,
  conversionRate,
  uniqueServices,
  loading,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const tiles: Tile[] = [
    { label: t('shell.nav.venueLeads'), value: String(venueCount), icon: <LocationOnIcon fontSize="small" />, color: 'primary' },
    { label: t('shell.nav.hostLeads'), value: String(hostCount), icon: <GroupsIcon fontSize="small" />, color: 'info' },
    { label: t('crm.common.totalLeads'), value: String(totalCount), icon: <AssessmentIcon fontSize="small" />, color: 'success' },
    {
      label: t('crm.dashboard.won'),
      value: `${conversionRate.toFixed(0)}%`,
      icon: <TrendingUpIcon fontSize="small" />,
      color: 'warning',
    },
    {
      label: t('shell.nav.servicesOffered'),
      value: String(uniqueServices),
      icon: <HandymanIcon fontSize="small" />,
      color: 'secondary',
    },
  ];

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{ width: '100%' }}
    >
      {tiles.map((tile) => (
        <StatCard
          key={tile.label}
          layout="default"
          iconPlacement="start"
          icon={tile.icon}
          iconBox={{ color: TILE_BG[tile.color], size: 28, radius: 1 }}
          label={tile.label.toUpperCase()}
          labelVariant="caption"
          labelWeight={700}
          labelSx={{ letterSpacing: 0.4 }}
          value={tile.value}
          loading={loading}
          skeletonProps={{ variant: 'rounded', height: 28, width: 64 }}
          cardVariant="elevation"
          headerSx={{ mb: 0.75, gap: 1.25 }}
          sx={{ flex: 1 }}
          contentSx={{ p: 2, '&:last-child': { pb: 2 } }}
        />
      ))}
    </Stack>
  );
}
