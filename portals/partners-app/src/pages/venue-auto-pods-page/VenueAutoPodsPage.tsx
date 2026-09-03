import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import {
  AutoPodQueue,
  AutoPodVenuePicker,
  AutoPodWithdrawAction,
  VenueAcceptDialog,
  VENUE_AUTO_PODS,
  type AutoPodVenueOption,
} from '@duncit/auto-pods';
import { EMPTY_LOCATION, type AdminLocationValue } from '@duncit/location';
import type { AutoPodRow } from '@duncit/utils';
import AutoPodFilters from '../../components/auto-pods/AutoPodFilters';
import AutoPodMineAction from '../../components/auto-pods/AutoPodMineAction';
import AutoPodsPageHeader from '../../components/auto-pods/AutoPodsPageHeader';
import useAutoPodsQueue from '../../components/auto-pods/useAutoPodsQueue';

/**
 * Auto Pods a venue may take — the venue goes first: a host is offered the pod
 * only once a venue has fixed its slot, and a club admin once a host is on it.
 * An accepted offer sits under "Assigned slot" with a Cancel until both are.
 * The venue picked at the top is the one looking — the offers are what THAT
 * venue could take (its category, its city), each card counting down the
 * window Pod Settings gives the offer. Accepting commits one of the venue's
 * own published slots, priced as the venue would be paid; when the venue is
 * the first to enrol its city pins the offer, and a venue elsewhere can no
 * longer take it. First venue to accept wins.
 */
export default function VenueAutoPodsPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<AutoPodRow | null>(null);
  const [venue, setVenue] = useState<AutoPodVenueOption | null>(null);
  const [location, setLocation] = useState<AdminLocationValue>(EMPTY_LOCATION);
  const queue = useAutoPodsQueue(VENUE_AUTO_PODS, 'venueAutoPods', {
    location_id: location.location_id || null,
    venue_id: venue?.id ?? null,
  });
  const renderAction = (row: AutoPodRow) => (
    <DuncitButton
      fullWidth
      size="small"
      variant="contained"
      onClick={() => setSelected(row)}
      disabled={!venue}
    >
      {queue.labels.acceptCta}
    </DuncitButton>
  );

  return (
    <Stack spacing={2} sx={{ width: '100%', pb: 4 }}>
      <AutoPodsPageHeader title={queue.labels.venueTitle} />
      <AutoPodVenuePicker value={venue} onChange={setVenue} labels={queue.labels} />
      <AutoPodFilters location={location} onLocationChange={setLocation} labels={queue.labels} />
      <AutoPodQueue
        role="venue"
        rows={queue.rows}
        labels={queue.labels}
        loading={queue.loading}
        error={queue.error}
        onRetry={queue.refetch}
        formatWhen={queue.formatWhen}
        formatMoney={queue.formatMoney}
        renderAction={renderAction}
        renderMineAction={(row) => (
          <Stack spacing={1}>
            <AutoPodMineAction row={row} labels={queue.labels} />
            <AutoPodWithdrawAction row={row} role="venue" labels={queue.labels} onWithdrawn={queue.refetch} />
          </Stack>
        )}
      />
      <VenueAcceptDialog
        row={selected}
        venue={venue}
        labels={queue.labels}
        open={!!selected}
        onClose={() => setSelected(null)}
        onAccepted={queue.refetch}
        formatWhen={queue.formatWhen}
        formatMoney={queue.formatMoney}
        // Venue Management lists every venue with a link into its availability.
        onAddAvailability={() => navigate('/register-venue')}
      />
    </Stack>
  );
}
