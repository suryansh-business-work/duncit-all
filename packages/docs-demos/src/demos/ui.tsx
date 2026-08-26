import GroupsIcon from '@mui/icons-material/Groups';
import PaymentsIcon from '@mui/icons-material/Payments';
import StorageIcon from '@mui/icons-material/Storage';
import { Paper, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import {
  InfoRow,
  PageHeader,
  SpotsStepper,
  StatCard,
  StatusChip,
  type SpotsStepperLabels,
} from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import { defineDemo, defineDemos } from '../types';

interface TilesMock {
  disk_used_gb: number;
  disk_total_gb: number;
  pods_completed: number;
  host_payouts: number;
}

interface RowsMock {
  pod_id: string;
  venue: string;
  spots: string;
  total: number;
  statuses: string[];
}

interface SpotsMock {
  no_of_spots: number;
  min_pax: number;
  venue_capacity: number;
  seats_taken: number;
}

/** The words a surface hands the control — mWeb passes `mwebSpotsLabels(t)`. */
const SPOTS_LABELS: SpotsStepperLabels = {
  totalSpots: 'Total spots',
  hint: 'Number of available tickets.',
  fixedHint: 'Set by the venue space you picked.',
  increase: 'Increase spots',
  decrease: 'Decrease spots',
};

/**
 * The control is uncontrolled-by-design: it owns no value, so a demo has to
 * hold one. Hoisted to module scope — a component defined inside `render`
 * remounts on every keystroke in the mock editor (S6478).
 */
function SpotsDemo({ mock }: Readonly<{ mock: SpotsMock }>) {
  const [spots, setSpots] = useState(mock.no_of_spots);
  useEffect(() => {
    setSpots(mock.no_of_spots);
  }, [mock.no_of_spots]);
  // Exactly what the server's `podSpotLimits` returns for a Club Admin: the
  // floor is whichever is higher, the activity's minimum or the seats sold.
  const min = Math.max(mock.min_pax, mock.seats_taken);
  const boundsHint = `The space this pod booked holds ${mock.venue_capacity} people. ${mock.seats_taken} seats are already taken.`;
  return (
    <SpotsStepper
      labels={SPOTS_LABELS}
      value={spots}
      onChange={setSpots}
      min={min}
      max={mock.venue_capacity}
      slidable={mock.venue_capacity > min}
      boundsHint={boundsHint}
    />
  );
}

export default defineDemos('ui', [
  defineDemo<TilesMock>({
    id: 'stat-cards',
    title: 'StatCard — the three layouts a dashboard uses',
    note: 'One tile per layout, with the numbers a real dashboard shows. Edit the mock to see the percent ring move.',
    mock: { disk_used_gb: 205, disk_total_gb: 250, pods_completed: 1284, host_payouts: 482150 },
    render: (mock) => (
      <Stack
        direction="row"
        sx={{
          flexWrap: "wrap",
          gap: 2
        }}>
        <StatCard
          label="Disk usage"
          value={`${mock.disk_used_gb} GB`}
          sub={`of ${mock.disk_total_gb} GB`}
          percent={Math.round((mock.disk_used_gb / mock.disk_total_gb) * 100)}
          icon={<StorageIcon fontSize="small" />}
          iconColor="text.secondary"
          sx={{ flex: '1 1 220px' }}
        />
        <StatCard
          layout="valueFirst"
          label="Pods completed"
          value={mock.pods_completed.toLocaleString('en-IN')}
          icon={<GroupsIcon />}
          iconBox={{ color: '#7c3aed' }}
          sx={{ flex: '1 1 220px' }}
        />
        <StatCard
          layout="split"
          label="Host payouts — July"
          value={formatMoney(mock.host_payouts)}
          hint="+12% vs June"
          hintColor="success.main"
          icon={<PaymentsIcon />}
          iconBox={{ color: '#0ea5e9', size: 44 }}
          sx={{ flex: '1 1 220px' }}
        />
      </Stack>
    ),
  }),

  defineDemo<RowsMock>({
    id: 'rows-and-chips',
    title: 'PageHeader, InfoRow and StatusChip',
    note:
      'StatusChip resolves its colour from a shared status map, so PENDING is the same amber in Finance as it is in Admin.',
    mock: {
      pod_id: 'DUN-POD-4821',
      venue: 'Play Arena, HSR Layout',
      spots: '7 of 8 taken',
      total: 3150,
      statuses: ['ACTIVE', 'PENDING', 'CANCELLED', 'COMPLETED', 'REFUNDED'],
    },
    render: (mock) => (
      <Stack spacing={2}>
        <PageHeader title="Pod detail" subtitle={mock.pod_id} />
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <InfoRow label="Venue" value={mock.venue} />
          <InfoRow label="Spots" value={mock.spots} />
          <InfoRow variant="split" bold label="Collected" value={formatMoney(mock.total)} />
        </Paper>
        <Stack direction="row" spacing={1} useFlexGap sx={{
          flexWrap: "wrap"
        }}>
          {mock.statuses.map((status) => (
            <StatusChip key={status} status={status} />
          ))}
        </Stack>
      </Stack>
    ),
  }),

  defineDemo<SpotsMock>({
    id: 'spots-stepper',
    title: 'SpotsStepper — sizing a pod, at creation and after it is live',
    note:
      'Drop venue_capacity to the floor and the slider becomes a plain stepper — there is nothing left to choose. Raise seats_taken past no_of_spots and the thumb cannot go back below the seats already sold.',
    mock: { no_of_spots: 12, min_pax: 4, venue_capacity: 30, seats_taken: 9 },
    render: (mock) => <SpotsDemo mock={mock} />,
  }),
]);
