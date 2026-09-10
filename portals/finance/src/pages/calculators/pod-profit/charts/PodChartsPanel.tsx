import { Stack } from '@mui/material';
import MoneySplitDonut from './MoneySplitDonut';
import PartyNetBar from './PartyNetBar';
import type { PodProfitResults } from '../types';

interface Props {
  results: PodProfitResults;
}

/**
 * The single pod, drawn two ways.
 *
 * Both charts read the SCALED figures rather than the per-pod ones. With a
 * count of 1 the two are the same number, and above 1 the scaled set is the one
 * the totals and the accordion headers already show — a chart that quietly
 * disagreed with the number printed beside it would be worse than no chart.
 */
export default function PodChartsPanel({ results }: Readonly<Props>) {
  const { scaled } = results;
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'stretch' }}>
      <MoneySplitDonut
        gst={scaled.gst_amount}
        venue={scaled.venue_receives}
        host={scaled.host_receives}
        duncit={scaled.duncit_revenue_total}
      />
      <PartyNetBar
        venue={scaled.venue_receives}
        host={scaled.host_receives}
        duncit={scaled.duncit_revenue_total}
        expenses={scaled.expenses}
      />
    </Stack>
  );
}
