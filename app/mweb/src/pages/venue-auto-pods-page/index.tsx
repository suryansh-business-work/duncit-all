import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { AutoPodQueue, VENUE_AUTO_PODS, VenueAcceptDialog } from '@duncit/auto-pods';
import type { AutoPodRow } from '@duncit/utils';
import AutoPodLocationBar from '../../components/auto-pods/AutoPodLocationBar';
import { useAutoPodCityLabel } from '../../hooks/useAutoPodCityLabel';
import { useAutoPodQueue } from '../../hooks/useAutoPodQueue';

interface Props {
  /** The header's selected location — '' shows every city's offers. */
  locationId: string;
}

/**
 * Venue Studio > Auto Pods.
 *
 * Enrolments happen in any order, so a venue may be the first in — its own
 * city then pins the offer — or the last. The card's three ticks say how far
 * the offer has got, which is why accepting also picks the slot, in one step.
 */
export default function VenueAutoPodsPage({ locationId }: Readonly<Props>) {
  const navigate = useNavigate();
  const queue = useAutoPodQueue(VENUE_AUTO_PODS, 'venueAutoPods', {
    location_id: locationId || null,
  });
  const cityLabel = useAutoPodCityLabel(locationId);
  const [target, setTarget] = useState<AutoPodRow | null>(null);

  return (
    <Stack spacing={2} sx={{ p: 2, pb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        {queue.labels.venueTitle}
      </Typography>

      <AutoPodLocationBar locationId={locationId} cityLabel={cityLabel} labels={queue.labels} />

      <AutoPodQueue
        role="venue"
        rows={queue.rows}
        labels={queue.labels}
        loading={queue.loading}
        error={queue.error}
        onRetry={queue.reload}
        formatWhen={queue.formatWhen}
        formatMoney={queue.formatMoney}
        renderAction={(row) => (
          <DuncitButton fullWidth variant="contained" onClick={() => setTarget(row)}>
            {queue.labels.acceptCta}
          </DuncitButton>
        )}
      />

      <VenueAcceptDialog
        row={target}
        labels={queue.labels}
        open={target !== null}
        onClose={() => setTarget(null)}
        onAccepted={queue.reload}
        formatWhen={queue.formatWhen}
        formatMoney={queue.formatMoney}
        onAddAvailability={() => navigate('/venues/manage')}
      />
    </Stack>
  );
}
