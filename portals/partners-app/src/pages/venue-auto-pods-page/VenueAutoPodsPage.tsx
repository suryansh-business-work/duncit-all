import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Stack } from '@mui/material';
import { AutoPodQueue, VenueAcceptDialog, VENUE_AUTO_PODS } from '@duncit/auto-pods';
import type { AutoPodRow } from '@duncit/utils';
import AutoPodMineAction from '../../components/auto-pods/AutoPodMineAction';
import AutoPodsPageHeader from '../../components/auto-pods/AutoPodsPageHeader';
import useAutoPodsQueue from '../../components/auto-pods/useAutoPodsQueue';

/**
 * Auto Pods a venue may take. The venue enrols FIRST — accepting commits one of
 * its own published slots, which is what gives the host and the club admin a
 * date to enrol against. First venue to accept wins, so the offer disappears
 * from every other venue's queue the moment one does.
 */
export default function VenueAutoPodsPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<AutoPodRow | null>(null);
  const queue = useAutoPodsQueue(VENUE_AUTO_PODS, 'venueAutoPods');

  const renderAction = (row: AutoPodRow) => (
    <Button fullWidth size="small" variant="contained" onClick={() => setSelected(row)}>
      {queue.labels.acceptCta}
    </Button>
  );

  return (
    <Stack spacing={2} sx={{ width: '100%', pb: 4 }}>
      <AutoPodsPageHeader title={queue.labels.venueTitle} />
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
        renderMineAction={(row) => <AutoPodMineAction row={row} labels={queue.labels} />}
      />
      <VenueAcceptDialog
        row={selected}
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
