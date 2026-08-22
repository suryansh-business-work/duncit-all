import { Grid } from '@mui/material';
import { StatCard } from '@duncit/ui';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import UpcomingIcon from '@mui/icons-material/Upcoming';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import TodayIcon from '@mui/icons-material/Today';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import PaidIcon from '@mui/icons-material/Paid';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import StarRateIcon from '@mui/icons-material/StarRate';
import { useTranslation } from '@duncit/shell';

interface Totals {
  total: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  awaiting_venue: number;
  live_today: number;
}

interface Props {
  totals: Totals | null;
  seats: { spots_total: number; seats_filled: number; occupancy_pct: number } | null;
  money: { revenue_total: number; payments_count: number; average_ticket: number } | null;
  ratings: { total: number; overall_average: number } | null;
  loading: boolean;
}

const rupees = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;

/**
 * The row of numbers the page opens with. The counts are live — a pod is
 * upcoming or it is not — while the money and ratings cover the chosen window,
 * which is why they carry a hint saying so.
 */
export default function PodDashboardTiles({ totals, seats, money, ratings, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const tiles = [
    { key: 'total', label: t('admin.podsDashboard.allPods'), value: totals?.total ?? 0, icon: <EventAvailableIcon fontSize="small" />, color: '#7c3aed', to: '/pods' },
    { key: 'upcoming', label: t('admin.podsDashboard.upcoming'), value: totals?.upcoming ?? 0, icon: <UpcomingIcon fontSize="small" />, color: '#2563eb' },
    { key: 'today', label: t('admin.podsDashboard.laterToday'), value: totals?.live_today ?? 0, icon: <TodayIcon fontSize="small" />, color: '#0891b2' },
    { key: 'completed', label: t('admin.podsDashboard.completed'), value: totals?.completed ?? 0, icon: <TaskAltIcon fontSize="small" />, color: '#0f766e' },
    { key: 'awaiting', label: t('admin.podsDashboard.awaitingVenue'), value: totals?.awaiting_venue ?? 0, icon: <HourglassTopIcon fontSize="small" />, color: '#d97706' },
    { key: 'cancelled', label: t('admin.eventTickets.cancelled'), value: totals?.cancelled ?? 0, icon: <CancelIcon fontSize="small" />, color: '#dc2626' },
    {
      key: 'occupancy',
      label: t('admin.podsDashboard.seatsFilled'),
      value: `${seats?.occupancy_pct ?? 0}%`,
      hint: `${(seats?.seats_filled ?? 0).toLocaleString('en-IN')} of ${(seats?.spots_total ?? 0).toLocaleString('en-IN')} spots`,
      icon: <EventSeatIcon fontSize="small" />,
      color: '#16a34a',
    },
    {
      key: 'revenue',
      label: t('admin.podsDashboard.collected'),
      value: rupees(money?.revenue_total ?? 0),
      hint: `${money?.payments_count ?? 0} payments`,
      icon: <PaidIcon fontSize="small" />,
      color: '#2563eb',
    },
    {
      key: 'ticket',
      label: t('admin.podsDashboard.averagePayment'),
      value: rupees(money?.average_ticket ?? 0),
      icon: <ReceiptLongIcon fontSize="small" />,
      color: '#7c3aed',
    },
    {
      key: 'rating',
      label: t('admin.podsDashboard.rated'),
      value: ratings?.total ? ratings.overall_average.toFixed(1) : '—',
      hint: `${ratings?.total ?? 0} ratings`,
      icon: <StarRateIcon fontSize="small" />,
      color: '#f59e0b',
    },
  ];

  return (
    <Grid container spacing={2}>
      {tiles.map((tile) => (
        <Grid item xs={6} sm={4} md={2.4} key={tile.key}>
          <StatCard
            layout="split"
            label={tile.label}
            value={loading && !totals ? '…' : tile.value}
            hint={tile.hint}
            valueVariant="h5"
            icon={tile.icon}
            iconBox={{ color: tile.color, alpha: 0.1, size: 40, radius: 1.5 }}
            to={tile.to}
            cardVariant="elevation"
            sx={{ height: '100%' }}
          />
        </Grid>
      ))}
    </Grid>
  );
}
