import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Stack, Typography } from '@mui/material';
import { AutoPodQueue, VENUE_AUTO_PODS, VenueAcceptDialog } from '@duncit/auto-pods';
import type { AutoPodRow } from '@duncit/utils';
import { useAutoPodQueue } from '../../hooks/useAutoPodQueue';

/**
 * Venue Studio > Auto Pods.
 *
 * The first of the three enrolments: nothing else can happen until a venue
 * commits a date, so this queue is where an Auto Pod stops being an idea. The
 * first venue to accept wins, and the card's three ticks say how far the offer
 * has got — which is why accepting also picks the slot, in one step.
 */
export default function VenueAutoPodsPage() {
  const navigate = useNavigate();
  const queue = useAutoPodQueue(VENUE_AUTO_PODS, 'venueAutoPods');
  const [target, setTarget] = useState<AutoPodRow | null>(null);

  return (
    <Stack spacing={2} sx={{ p: 2, pb: 4 }}>
      <Typography variant="h6" fontWeight={800}>
        {queue.labels.venueTitle}
      </Typography>

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
          <Button fullWidth variant="contained" onClick={() => setTarget(row)}>
            {queue.labels.acceptCta}
          </Button>
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
