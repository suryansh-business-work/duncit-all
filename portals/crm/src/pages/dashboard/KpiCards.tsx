import { Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GroupsIcon from '@mui/icons-material/Groups';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HandymanIcon from '@mui/icons-material/Handyman';

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
  const tiles: Tile[] = [
    { label: 'Venue Leads', value: String(venueCount), icon: <LocationOnIcon fontSize="small" />, color: 'primary' },
    { label: 'Host Leads', value: String(hostCount), icon: <GroupsIcon fontSize="small" />, color: 'info' },
    { label: 'Total Leads', value: String(totalCount), icon: <AssessmentIcon fontSize="small" />, color: 'success' },
    {
      label: 'Won %',
      value: `${conversionRate.toFixed(0)}%`,
      icon: <TrendingUpIcon fontSize="small" />,
      color: 'warning',
    },
    {
      label: 'Services Offered',
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
        <Card key={tile.label} sx={{ flex: 1 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.75 }}>
              <Stack
                alignItems="center"
                justifyContent="center"
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1,
                  bgcolor: alpha(TILE_BG[tile.color], 0.16),
                  color: TILE_BG[tile.color],
                }}
              >
                {tile.icon}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
                {tile.label.toUpperCase()}
              </Typography>
            </Stack>
            {loading ? (
              <Skeleton variant="rounded" height={28} width={64} />
            ) : (
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {tile.value}
              </Typography>
            )}
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
