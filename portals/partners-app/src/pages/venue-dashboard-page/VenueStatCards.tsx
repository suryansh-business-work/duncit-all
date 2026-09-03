import { Grid } from '@mui/material';
import { StatCard } from '@duncit/ui';
import {
  formatMoney,
  venueOwnerStatTiles,
  type VenueOwnerStatKey,
  type VenueOwnerStatTile,
  type VenueOwnerStats,
} from '@duncit/utils';
import { useTranslation } from '@duncit/shell';

const formatCount = (value: number) => Number(value || 0).toLocaleString('en-IN');

type Translate = ReturnType<typeof useTranslation>['t'];

interface TileCopy {
  label: string;
  hint: string;
}

/** The words on each tile; WHICH tiles, and in what order, is `venueOwnerStatTiles`. */
const tileCopy = (t: Translate): Record<VenueOwnerStatKey, TileCopy> => ({
  potential_earning: { label: t('partners.venueDashboardPage.potentialEarnings'), hint: 'Value of every upcoming published slot' },
  booked_earning: { label: t('partners.venueDashboardPage.bookedValue'), hint: 'Upcoming slots already booked by pods' },
  upcoming_slots: { label: t('partners.venueDashboardPage.upcomingSlots'), hint: 'Published slots from today onwards' },
  booked_slots: { label: t('partners.venueDashboardPage.bookedSlots'), hint: 'Upcoming slots a pod has already taken' },
  pending_requests: { label: t('partners.venueDashboardPage.pendingRequests'), hint: 'Slot bookings waiting for your approval' },
  total_capacity: { label: t('partners.venueDashboardPage.totalCapacity'), hint: 'Sum of all capacity entries' },
});

const tileValue = (tile: VenueOwnerStatTile) =>
  tile.kind === 'money' ? formatMoney(tile.value) : formatCount(tile.value);

interface Props {
  stats: VenueOwnerStats;
  loading: boolean;
}

export default function VenueStatCards({ stats, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const copy = tileCopy(t);
  return (
    <Grid container spacing={2}>
      {venueOwnerStatTiles(stats).map((tile) => (
        <Grid
          key={tile.key}
          size={{
            xs: 12,
            sm: 6,
            md: 4,
            lg: 2
          }}>
          <StatCard
            label={copy[tile.key].label}
            labelWeight={800}
            labelSx={{ lineHeight: 1.4 }}
            value={tileValue(tile)}
            valueWeight={950}
            hint={copy[tile.key].hint}
            loading={loading}
            skeletonProps={{ width: 90, height: 36 }}
            headerSx={{ mb: 0.75 }}
            sx={{ height: '100%', borderRadius: 2 }}
          />
        </Grid>
      ))}
    </Grid>
  );
}
