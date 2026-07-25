import { useEffect, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Card, CircularProgress, Stack, Typography } from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import { usePricing } from '../../../hooks/usePricing';

/** Server-side potential-earnings waterfall. The server bills payable spots
 * (total − 1, the host's own seat is free) — no money math happens here. */
export const POTENTIAL_POD_EARNINGS = gql`
  query PotentialPodEarnings(
    $pod_amount: Float!
    $no_of_spots: Int!
    $venue_id: ID
    $venue_amount: Float
  ) {
    potentialPodEarnings(
      pod_amount: $pod_amount
      no_of_spots: $no_of_spots
      venue_id: $venue_id
      venue_amount: $venue_amount
    ) {
      total_spots
      payable_spots
      waterfall {
        amount
        gst_pct
        gst_amount
        platform_fee_pct
        platform_fee_amount
        club_admin_pct
        club_admin_amount
        venue_amount
        host_amount
        host_commission_pct
        host_commission_amount
        host_receives
        host_earn_pct
      }
    }
  }
`;

interface Props {
  slotPrice: number | null;
  podAmount: number;
  noOfSpots: number;
  venueId: string | null;
  isPhysical: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Debounced (400ms) copy of the pricing inputs so typing doesn't spam the API.
 * Both are primitives, so the effect only re-runs on a real value change. */
function useDebouncedInputs(podAmount: number, noOfSpots: number) {
  const [inputs, setInputs] = useState({ podAmount, noOfSpots });
  useEffect(() => {
    const t = setTimeout(() => setInputs({ podAmount, noOfSpots }), 400);
    return () => clearTimeout(t);
  }, [podAmount, noOfSpots]);
  return inputs;
}

/** The host's final calculation for a pod. The server owns every number: it
 * bills PAYABLE spots (total − 1, because the host's own seat is free) and
 * deducts the venue's fixed slot price once for the pod — not once per booking —
 * matching how the pod is actually settled. */
export default function PricePanel({ slotPrice, podAmount, noOfSpots, venueId, isPhysical }: Readonly<Props>) {
  const { currency } = usePricing();
  const sent = useDebouncedInputs(podAmount, noOfSpots);
  const hasVenue = isPhysical && slotPrice !== null;
  const { data, loading } = useQuery(POTENTIAL_POD_EARNINGS, {
    variables: {
      pod_amount: sent.podAmount,
      no_of_spots: sent.noOfSpots,
      venue_id: hasVenue ? venueId : null,
      venue_amount: hasVenue ? slotPrice : null,
    },
    skip: sent.podAmount <= 0 || sent.noOfSpots <= 1,
    fetchPolicy: 'cache-and-network',
  });
  const projection = data?.potentialPodEarnings;
  const w = projection?.waterfall;

  const money = (value: number) => `${currency}${round2(value).toLocaleString('en-IN')}`;
  const fmt = (value: number) => `${currency}${(Number(value) || 0).toFixed(2)}`;

  const breakdown = () => {
    if (podAmount <= 0 || noOfSpots <= 0) {
      return (
        <Typography variant="caption" color="text.secondary">
          Set a ticket price and the number of spots to preview your earnings.
        </Typography>
      );
    }
    // A 1-spot pod is the host's own free seat — there is nothing to bill.
    if (noOfSpots === 1) {
      return (
        <Typography variant="caption" color="text.secondary" data-testid="price-panel-host-only">
          This pod only has your own spot, which is free. Add more spots to earn.
        </Typography>
      );
    }
    // During the debounce window the previous waterfall would render beside
    // labels built from the live inputs — treat it as loading instead.
    const stale = sent.podAmount !== podAmount || sent.noOfSpots !== noOfSpots;
    if (!w || !projection || stale) {
      return loading || stale ? <CircularProgress size={18} /> : null;
    }
    return (
      <Stack spacing={0.75}>
        <Row
          label={`Total collection (${money(podAmount)} × ${projection.payable_spots})`}
          value={fmt(w.amount)}
          bold
          color="success.main"
        />
        <Row label={`− GST (${w.gst_pct}%)`} value={fmt(w.gst_amount)} />
        <Row label={`− Platform Fee (${w.platform_fee_pct}%)`} value={fmt(w.platform_fee_amount)} />
        {w.club_admin_amount > 0 && (
          <Row label={`− Club Admin (${w.club_admin_pct}%)`} value={fmt(w.club_admin_amount)} />
        )}
        {hasVenue && <Row label="− Venue slot price" value={fmt(w.venue_amount)} />}
        <Row label="Your Amount (remainder)" value={fmt(w.host_amount)} />
        <Row label={`− Your Commission (${w.host_commission_pct}%)`} value={fmt(w.host_commission_amount)} />
        <Row label="You Receive" value={fmt(w.host_receives)} bold color="success.main" />
        <Typography variant="caption" color="text.secondary">
          For {projection.payable_spots} paying pax · {w.host_earn_pct}% of collection
        </Typography>
      </Stack>
    );
  };

  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }} data-testid="create-pod-price-panel">
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <InsightsIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2" fontWeight={900}>
            Potential earnings
          </Typography>
        </Stack>
        <Typography variant="caption" fontWeight={800} color="text.secondary">
          Your take-home for the full pod
        </Typography>
        {noOfSpots > 0 && (
          <Typography variant="caption" color="text.secondary" data-testid="price-panel-host-free-note">
            Your spot is free — the calculation is based on total spots − 1 ({noOfSpots} − 1 ={' '}
            {noOfSpots - 1}).
          </Typography>
        )}
        {breakdown()}
        <Typography variant="caption" color="text.secondary">
          Estimates at today&apos;s rates — final settlement happens after the pod completes.
        </Typography>
      </Stack>
    </Card>
  );
}

function Row({ label, value, bold = false, color }: Readonly<{ label: string; value: string; bold?: boolean; color?: string }>) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" color={bold ? 'text.primary' : 'text.secondary'} fontWeight={bold ? 800 : 500}>
        {label}
      </Typography>
      <Typography variant="body2" color={color} fontWeight={bold ? 900 : 700}>
        {value}
      </Typography>
    </Stack>
  );
}
