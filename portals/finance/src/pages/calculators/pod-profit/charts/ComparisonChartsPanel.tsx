import { Stack } from '@mui/material';
import MoneySplitDonut from './MoneySplitDonut';
import PartyNetBar from './PartyNetBar';
import PodComparisonBar from './PodComparisonBar';
import type { PodRow, PodTotals } from '../saved/types';

interface Props {
  rows: readonly PodRow[];
  totals: PodTotals;
}

/**
 * The comparison, drawn three ways: pod against pod, then the two whole-
 * comparison views the single tab also shows.
 *
 * The per-pod bar comes first because it is the only chart here that answers
 * the question this tab exists for — which of these pods is worth running.
 */
export default function ComparisonChartsPanel({ rows, totals }: Readonly<Props>) {
  return (
    <Stack spacing={2}>
      <PodComparisonBar rows={rows} />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'stretch' }}>
        <MoneySplitDonut
          gst={totals.gst_amount}
          venue={totals.venue_receives}
          host={totals.host_receives}
          duncit={totals.duncit_revenue_total}
        />
        <PartyNetBar
          venue={totals.venue_receives}
          host={totals.host_receives}
          duncit={totals.duncit_revenue_total}
          expenses={totals.expenses}
        />
      </Stack>
    </Stack>
  );
}
