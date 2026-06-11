import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, CircularProgress, Stack } from '@mui/material';
import HealthScoreCard from '../user-details-page/UserHealthSection/HealthScoreCard';
import {
  VENUE_HEALTH,
  type AdminHealthScore,
} from '../user-details-page/UserHealthSection/queries';

interface Props {
  venueId: string;
}

// Reuses the admin HealthScoreCard + AdjustHealthDialog from the User Details
// surface — the card is already polymorphic over USER / VENUE subjects, so we
// don't duplicate the UI. Only the data source (venueHealth vs userAccountHealth)
// differs.
export default function VenueHealthCard({ venueId }: Readonly<Props>) {
  const { data, loading, error } = useQuery<{ venueHealth: AdminHealthScore | null }>(
    VENUE_HEALTH,
    { variables: { venue_id: venueId }, fetchPolicy: 'cache-and-network', skip: !venueId }
  );
  const [override, setOverride] = useState<AdminHealthScore | null>(null);
  const score = override ?? data?.venueHealth;

  if (loading && !data) {
    return (
      <Stack alignItems="center" sx={{ py: 4 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!score) return null;

  return <HealthScoreCard score={score} onUpdated={setOverride} />;
}
