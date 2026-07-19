import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Stack, Tab, Tabs } from '@mui/material';
import { BackHeader, QueryGuard } from '@duncit/ui';
import { VENUE_DETAILS, type AdminVenueDetails } from './queries';
import VenueOverviewCard from './VenueOverviewCard';
import VenuePodsTab from './VenuePodsTab';

// Slot Availability + Account Health are not applicable to onboarded venue
// details and are intentionally not shown here.
const TABS = ['Overview', 'Pods'] as const;

export default function VenueDetailsPage() {
  const { venueId = '' } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Deep-link support: /venues/:id?tab=pods opens the Pods tab (from the
  // Onboarded Venues table's pod-count button).
  const initialTab = searchParams.get('tab') === 'pods' ? TABS.indexOf('Pods') : 0;
  const [tab, setTab] = useState(initialTab);
  const { data, loading, error } = useQuery<{ venue: AdminVenueDetails | null }>(VENUE_DETAILS, {
    variables: { venue_doc_id: venueId },
    fetchPolicy: 'cache-and-network',
    skip: !venueId,
  });

  return (
    <QueryGuard
      loading={loading && !data}
      error={error}
      errorText={error?.message}
      notFound={!data?.venue}
      notFoundText="Venue not found."
      notFoundSeverity="warning"
      spinnerSx={{ p: 6 }}
    >
      {() => {
        const venue = data!.venue!;
        return (
          <Stack spacing={2.5}>
            <BackHeader
              onBack={() => navigate('/venues')}
              backAriaLabel="Back to venues"
              backSx={{ bgcolor: 'action.hover' }}
              eyebrow="Venue"
              title={venue.venue_name || 'Untitled venue'}
              titleWeight={950}
              titleSx={{ lineHeight: 1.1 }}
            />

            <Tabs value={tab} onChange={(_e, value) => setTab(value)} variant="scrollable" allowScrollButtonsMobile>
              {TABS.map((label) => (
                <Tab key={label} label={label} />
              ))}
            </Tabs>

            {tab === 0 && <VenueOverviewCard venue={venue} />}

            {tab === 1 && <VenuePodsTab venueId={venue.id} />}
          </Stack>
        );
      }}
    </QueryGuard>
  );
}
