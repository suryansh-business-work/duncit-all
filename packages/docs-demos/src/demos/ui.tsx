import GroupsIcon from '@mui/icons-material/Groups';
import PaymentsIcon from '@mui/icons-material/Payments';
import StorageIcon from '@mui/icons-material/Storage';
import { Paper, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import { DuncitButton } from '@duncit/buttons';
import {
  ChipList,
  InfoRow,
  Loader,
  LoadingOverlay,
  PageHeader,
  PodSeatsCell,
  ScrollRail,
  SpotsStepper,
  StatCard,
  StatusChip,
  TicketDiscountField,
  TopProgressBar,
  type LoaderVariant,
  type SpotsStepperLabels,
  type TicketDiscountFieldErrors,
} from '@duncit/ui';
import { POD_FORM_BUNDLE, createTranslator, flattenCatalogue } from '@duncit/i18n';
import {
  TICKET_DISCOUNT_MAX_TIERS,
  formatMoney,
  podFormTicketDiscountLabels,
  ticketDiscountMaxTickets,
  ticketDiscountTierIssues,
  type TicketDiscountIssue,
  type TicketDiscountLimits,
  type TicketDiscountTier,
} from '@duncit/utils';
import { defineDemo, defineDemos } from '../types';

interface SeatsMock {
  seats_taken: number;
  bookings: number;
  no_of_spots: number;
}

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
  perks: string[];
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

interface TicketDiscountMock {
  pod_id: string;
  pod_amount: number;
  no_of_spots: number;
  /** `publicAppSettings.ticket_discount_max_pct`. */
  ticket_discount_max_pct: number;
  ticket_discount_enabled: boolean;
  ticket_discount_tiers: TicketDiscountTier[];
}

/** The portal pod form's own English for `podForm.ticketDiscount.*`, resolved the way the form does. */
const { t: podFormT } = createTranslator({ locale: 'en-IN', fallback: flattenCatalogue(POD_FORM_BUNDLE) });
const TICKET_DISCOUNT_LABELS = podFormTicketDiscountLabels(podFormT);

const formatPaise = (amount: number) => formatMoney(amount, { decimals: 2 });

/**
 * What a surface's Zod superRefine does with the shared issue list: one
 * translated message per path, the first issue on a field winning.
 */
function toFieldErrors(
  issues: readonly TicketDiscountIssue[],
  limits: TicketDiscountLimits,
): TicketDiscountFieldErrors {
  const rows: Array<{ min_tickets?: string; discount_pct?: string }> = [];
  let list: string | undefined;
  for (const issue of issues) {
    const message = TICKET_DISCOUNT_LABELS.errors[issue.code](limits);
    if (issue.index === null) {
      list ??= message;
    } else {
      rows[issue.index] = { [issue.field]: message, ...rows[issue.index] };
    }
  }
  return { list, rows };
}

/** Holds the ladder the way a form would — hoisted for the same reason as `SpotsDemo`. */
function TicketDiscountDemo({ mock }: Readonly<{ mock: TicketDiscountMock }>) {
  const [enabled, setEnabled] = useState(mock.ticket_discount_enabled);
  const [tiers, setTiers] = useState(mock.ticket_discount_tiers);
  useEffect(() => {
    setEnabled(mock.ticket_discount_enabled);
    setTiers(mock.ticket_discount_tiers);
  }, [mock.ticket_discount_enabled, mock.ticket_discount_tiers]);
  const limits: TicketDiscountLimits = {
    maxPct: mock.ticket_discount_max_pct,
    maxTickets: ticketDiscountMaxTickets(mock.no_of_spots),
    maxTiers: TICKET_DISCOUNT_MAX_TIERS,
  };
  const issues = ticketDiscountTierIssues({
    enabled,
    tiers,
    maxPct: limits.maxPct,
    maxTickets: limits.maxTickets,
  });
  return (
    <TicketDiscountField
      enabled={enabled}
      tiers={tiers}
      onEnabledChange={setEnabled}
      onTiersChange={setTiers}
      maxPct={limits.maxPct}
      maxTickets={limits.maxTickets}
      labels={TICKET_DISCOUNT_LABELS}
      unitPrice={mock.pod_amount}
      formatPrice={formatPaise}
      errors={toFieldErrors(issues, limits)}
    />
  );
}

interface RailMock {
  pods: { pod_id: string; title: string; price: number }[];
}

interface LoaderMock {
  variant: LoaderVariant;
  serverMs: number;
  rows: string[];
}

/**
 * The wait every console page has: a list that is already on screen, refreshing.
 * Hoisted for the same reason as `SpotsDemo`.
 */
function LoaderDemo({ mock }: Readonly<{ mock: LoaderMock }>) {
  const [busy, setBusy] = useState(false);
  const refresh = () =>
    new Promise<void>((resolve) => {
      setBusy(true);
      setTimeout(() => {
        setBusy(false);
        resolve();
      }, mock.serverMs);
    });
  const rows = (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1}>
        {mock.rows.map((row) => (
          <InfoRow key={row} variant="split" label={row} value="APPROVED" />
        ))}
      </Stack>
    </Paper>
  );
  return (
    <Stack spacing={2}>
      <TopProgressBar busy={busy} />
      <DuncitButton variant="contained" onClick={refresh}>
        Refresh venues
      </DuncitButton>
      {mock.variant === 'overlay' ? (
        <LoadingOverlay open={busy} showLabel label="Refreshing venues…">
          {rows}
        </LoadingOverlay>
      ) : (
        <>{busy ? <Loader variant={mock.variant} showLabel /> : rows}</>
      )}
    </Stack>
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
    title: 'PageHeader, InfoRow, StatusChip and ChipList',
    note:
      'StatusChip resolves its colour from a shared status map, so PENDING is the same amber in Finance as it is in Admin. Empty the perks list and ChipList draws the dash instead — that is the row an Auto Pod summary shows for anything not written yet.',
    mock: {
      pod_id: 'DUN-POD-4821',
      venue: 'Play Arena, HSR Layout',
      spots: '7 of 8 taken',
      total: 3150,
      perks: ['Water', 'Parking', 'Rackets provided'],
      statuses: ['ACTIVE', 'PENDING', 'CANCELLED', 'COMPLETED', 'REFUNDED'],
    },
    render: (mock) => (
      <Stack spacing={2}>
        <PageHeader title="Pod detail" subtitle={mock.pod_id} />
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <InfoRow label="Venue" value={mock.venue} />
          <InfoRow label="Spots" value={mock.spots} />
          <InfoRow variant="split" bold label="Collected" value={formatMoney(mock.total)} />
          <InfoRow label="Available perks" value={<ChipList items={mock.perks} empty="—" />} />
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

  defineDemo<TicketDiscountMock>({
    id: 'ticket-discount-field',
    title: 'TicketDiscountField — a ₹499 pod giving 10% off 2+ tickets and 20% off 4+',
    note:
      'Type 5 into the second tier’s discount and it goes red: every tier must give more than the one above. Drop no_of_spots to 4 and the 4-ticket tier can no longer be reached (3 payable seats). Lower ticket_discount_max_pct to 15 and the 20% tier is over the admin’s cap. Switch it off and the tiers are gone.',
    mock: {
      pod_id: 'DUN-POD-4821',
      pod_amount: 499,
      no_of_spots: 12,
      ticket_discount_max_pct: 50,
      ticket_discount_enabled: true,
      ticket_discount_tiers: [
        { min_tickets: 2, discount_pct: 10 },
        { min_tickets: 4, discount_pct: 20 },
      ],
    },
    render: (mock) => <TicketDiscountDemo mock={mock} />,
  }),

  defineDemo<SeatsMock>({
    id: 'pod-seats-cell',
    title: 'PodSeatsCell — a pod sold out by three people who bought 1, 7 and 2 seats',
    note:
      'Set seats_taken to 3 (what pod_attendees.length used to report) and the hint flips to "one seat each" — that is exactly the reading that made a full pod look empty in every pods table. Drop no_of_spots to 0 and the "/ N" disappears: 0 spots means uncapped, not full.',
    mock: { seats_taken: 10, bookings: 3, no_of_spots: 10 },
    render: (mock) => (
      <PodSeatsCell seats={mock.seats_taken} bookings={mock.bookings} total={mock.no_of_spots} />
    ),
  }),

  defineDemo<RailMock>({
    id: 'scroll-rail',
    title: 'ScrollRail — a club page "Previous" rail with left/right arrows',
    note: 'The arrows appear only when the row overflows, and each one fades at its own edge. Delete pods from the mock until they all fit and both arrows disappear.',
    mock: {
      pods: [
        { pod_id: 'DUN-POD-4821', title: 'Sunday Pickleball, HSR Layout', price: 199 },
        { pod_id: 'DUN-POD-4790', title: 'Board Game Night', price: 249 },
        { pod_id: 'DUN-POD-4756', title: 'The Duncit House Party', price: 500 },
        { pod_id: 'DUN-POD-4702', title: 'Sunrise Trek, Nandi Hills', price: 350 },
        { pod_id: 'DUN-POD-4688', title: 'Pottery Workshop', price: 799 },
      ],
    },
    render: (mock) => (
      <ScrollRail testId="demo-scroll-rail" gap={1.5}>
        {mock.pods.map((pod) => (
          <Paper key={pod.pod_id} variant="outlined" sx={{ width: 180, p: 1.5, borderRadius: 2 }}>
            <InfoRow label={pod.pod_id} value={pod.title} />
            <InfoRow variant="split" label="Price" value={formatMoney(pod.price)} />
          </Paper>
        ))}
      </ScrollRail>
    ),
  }),

  defineDemo<LoaderMock>({
    id: 'loader',
    title: 'Loader — the four shapes a wait actually takes',
    note:
      'Press Refresh venues. The overlay keeps the rows readable underneath, which is what makes a refetch feel like a refresh rather than a reload — swap `variant` to block and watch the same wait blank the panel instead. `serverMs` is the round trip; under about 180ms the top bar never appears at all, because a bar that flashes reads as a glitch rather than as progress. In a real app the same bar is `RequestProgressBar`, driven by `trackingFetch` on the Apollo HttpLink — the portals mount it through the shell, the pet store mounts it itself.',
    mock: { variant: 'overlay', serverMs: 1400, rows: ['Play Arena, HSR Layout', 'Smashtress, Raj Nagar Extension', 'The Turf Club, Indiranagar'] },
    render: (mock) => <LoaderDemo mock={mock} />,
  }),
]);
