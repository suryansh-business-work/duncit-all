import { useQuery } from '@apollo/client/react';
import { Alert, Grid, Skeleton } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { StatCard } from '@duncit/ui';
import { formatMoney, parseApiError, type RentalVenueStats } from '@duncit/utils';
import { VENUE_RENTAL_STATS } from '../documents';

interface Props {
  venueId: string;
}

type StatKey = Exclude<keyof RentalVenueStats, 'currency_symbol'>;
type Tile = { key: StatKey; money: boolean };

const TILES: readonly Tile[] = [
  { key: 'bookings', money: false },
  { key: 'open', money: false },
  { key: 'rent_total', money: true },
  { key: 'deposits_held', money: true },
  { key: 'earned', money: true },
  { key: 'paid_out', money: true },
];

const LABEL_KEY: Record<StatKey, string> = {
  bookings: 'venueRentals.stats.bookings',
  open: 'venueRentals.stats.open',
  rent_total: 'venueRentals.stats.rentTotal',
  deposits_held: 'venueRentals.stats.depositsHeld',
  earned: 'venueRentals.stats.earned',
  paid_out: 'venueRentals.stats.paidOut',
};

/** A venue's rented items in numbers: what is out, what is held and what it has earned. */
export default function VenueRentalStatsTiles({ venueId }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery(VENUE_RENTAL_STATS, {
    variables: { venue_id: venueId },
    fetchPolicy: 'cache-and-network',
  });
  const stats = data?.venueRentalStats;

  if (error && !stats) {
    return (
      <Alert
        severity="error"
        action={
          <DuncitButton color="inherit" size="small" onClick={() => refetch().catch(() => undefined)}>
            {t('venueRentals.guest.retry')}
          </DuncitButton>
        }
      >
        {parseApiError(error)}
      </Alert>
    );
  }
  return (
    <Grid container spacing={2} data-testid="venue-rental-stats">
      {TILES.map((tile) => (
        <Grid key={tile.key} size={{ xs: 6, sm: 4, md: 2 }}>
          {loading && !stats ? (
            <Skeleton variant="rounded" height={96} />
          ) : (
            <StatCard
              label={t(LABEL_KEY[tile.key])}
              value={tile.money ? formatMoney(stats?.[tile.key] ?? 0, { symbol: stats?.currency_symbol }) : String(stats?.[tile.key] ?? 0)}
              valueVariant="h5"
              sx={{ height: '100%', borderRadius: 2 }}
              data-testid={`venue-rental-stat-${tile.key}`}
            />
          )}
        </Grid>
      ))}
    </Grid>
  );
}
