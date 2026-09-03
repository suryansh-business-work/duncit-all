import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import {
  AutoPodExpiryNote,
  AutoPodQueue,
  AutoPodVenuePicker,
  AutoPodWithdrawAction,
  VENUE_AUTO_PODS,
  VenueAcceptDialog,
  type AutoPodVenueOption,
} from '@duncit/auto-pods';
import type { AutoPodRow } from '@duncit/utils';
import AutoPodLocationBar from '../../components/auto-pods/AutoPodLocationBar';
import { useAutoPodCityLabel } from '../../hooks/useAutoPodCityLabel';
import { useAutoPodQueue } from '../../hooks/useAutoPodQueue';
import { useDateFormat } from '../../utils/dateFormat';

interface Props {
  /** The header's selected location — '' shows every city's offers. */
  locationId: string;
}

/** Re-renders once a minute, so the cards' countdowns keep moving. */
function useMinuteTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  return tick;
}

/**
 * Venue Studio > Auto Pods.
 *
 * The venue picked at the top is the one looking: the offers are what THAT
 * venue could take (its category, its city), each counting down the window
 * Pod Settings gives venues to accept. Accepting picks one of the venue's free
 * slots in the next few days, nearest first, priced as the venue would be paid
 * — in one step, because an acceptance with no date would leave hosts and
 * club admins nothing to enrol against. The venue goes first: hosts are
 * offered the pod only once the slot is fixed. An accepted offer sits under
 * "Assigned slot" with a Cancel until a host and a club admin are on it.
 * Native twin: `VenueAutoPodsScreen`.
 */
export default function VenueAutoPodsPage({ locationId }: Readonly<Props>) {
  const navigate = useNavigate();
  const [venue, setVenue] = useState<AutoPodVenueOption | null>(null);
  const queue = useAutoPodQueue(VENUE_AUTO_PODS, 'venueAutoPods', {
    location_id: locationId || null,
    venue_id: venue?.id ?? null,
  });
  const cityLabel = useAutoPodCityLabel(locationId);
  const { clock } = useDateFormat();
  useMinuteTick();
  const nowMs = clock.nowMs();
  const [target, setTarget] = useState<AutoPodRow | null>(null);

  return (
    <Stack spacing={2} sx={{ p: 2, pb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        {queue.labels.venueTitle}
      </Typography>

      <AutoPodVenuePicker value={venue} onChange={setVenue} labels={queue.labels} />
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
          <Stack spacing={1}>
            <AutoPodExpiryNote expiresAt={row.venue_expires_at} nowMs={nowMs} labels={queue.labels} />
            <DuncitButton fullWidth variant="contained" onClick={() => setTarget(row)} disabled={!venue}>
              {queue.labels.acceptCta}
            </DuncitButton>
          </Stack>
        )}
        renderMineAction={(row) => (
          <AutoPodWithdrawAction row={row} role="venue" labels={queue.labels} onWithdrawn={queue.reload} />
        )}
      />

      <VenueAcceptDialog
        row={target}
        venue={venue}
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
