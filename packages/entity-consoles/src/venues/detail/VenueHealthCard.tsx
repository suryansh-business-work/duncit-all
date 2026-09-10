import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { QueryGuard } from '@duncit/ui';
import HealthScoreCard from '../../shared/health/HealthScoreCard';
import {
  VENUE_HEALTH,
  type AdminHealthScore,
} from '../../shared/health/queries';

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

  return (
    <QueryGuard loading={loading && !data} error={error} errorText={error?.message} spinnerSize={24} spinnerSx={{ py: 4 }}>
      {() => (score ? <HealthScoreCard score={score} onUpdated={setOverride} /> : null)}
    </QueryGuard>
  );
}
