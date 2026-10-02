import { Paper } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import {
  InfoRow,
  PodSeatsCell,
  ScrollRail,
  categoryAxis,
  chartSeriesColor,
  chartTooltip,
  lineTrendDataset,
  lineTrendOptions,
  valueAxis,
} from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import { defineDemo, defineDemos } from '../types';
// Each rendered demo's component and mock shape live beside this file.
import { StatCardsDemo, type TilesMock } from './ui/StatCardsDemo';
import { RowsAndChipsDemo, type RowsMock } from './ui/RowsAndChipsDemo';
import { SpotsDemo, type SpotsMock } from './ui/SpotsDemo';
import { TicketDiscountDemo, type TicketDiscountMock } from './ui/TicketDiscountDemo';
import { LoaderDemo, type LoaderMock } from './ui/LoaderDemo';

interface ChartFrameMock {
  mode: 'light' | 'dark';
  host_payouts: number;
  max_ticks: number;
}

interface SeatsMock {
  seats_taken: number;
  bookings: number;
  no_of_spots: number;
}

interface RailMock {
  pods: { pod_id: string; title: string; price: number }[];
}

export default defineDemos('ui', [
  defineDemo<TilesMock>({
    id: 'stat-cards',
    title: 'StatCard — the three layouts a dashboard uses',
    note: 'One tile per layout, with the numbers a real dashboard shows. Edit the mock to see the percent ring move.',
    mock: { disk_used_gb: 205, disk_total_gb: 250, pods_completed: 1284, host_payouts: 482150 },
    render: (mock) => <StatCardsDemo mock={mock} />,
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
    render: (mock) => <RowsAndChipsDemo mock={mock} />,
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

  defineDemo<ChartFrameMock>({
    id: 'chart-frame',
    title: 'chartTooltip, valueAxis, categoryAxis, lineTrend* — the frame every console chart shares',
    note:
      'Switch mode to dark and every colour follows the theme. host_payouts runs through the value axis tick formatter exactly as a ₹ axis prints it; max_ticks is how many day labels the category axis keeps before thinning. loneLine is how a single trend line is drawn, filled in the first series colour; legendForSeveral is whether a legend appears once lines can cross.',
    mock: { mode: 'light', host_payouts: 482150, max_ticks: 10 },
    compute: (mock) => {
      const theme = createTheme({ palette: { mode: mock.mode } });
      return {
        tooltip: chartTooltip(theme),
        valueTick: valueAxis(theme, formatMoney).ticks.callback(mock.host_payouts),
        categoryAxis: categoryAxis(theme, mock.max_ticks),
        firstSeriesColor: chartSeriesColor(theme, 0),
        loneLine: lineTrendDataset(theme, 0, true),
        legendForSeveral: lineTrendOptions(theme, false).plugins.legend.display,
      };
    },
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
