import { useEffect, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Card, CircularProgress, Stack, Typography } from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import { usePricing } from '../../../hooks/usePricing';

/** Server-side potential-earnings waterfall for a hypothetical total collection. */
export const POTENTIAL_POD_EARNINGS = gql`
  query PotentialPodEarnings($amount: Float!, $venue_id: ID, $venue_amount: Float) {
    potentialPodEarnings(amount: $amount, venue_id: $venue_id, venue_amount: $venue_amount) {
      amount
      gst_pct
      gst_amount
      platform_fee_pct
      platform_fee_amount
      venue_amount
      host_amount
      host_commission_pct
      host_commission_amount
      host_receives
      host_earn_pct
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

/** Debounced (400ms) copy of the collection so typing doesn't spam the API. */
function useDebouncedAmount(value: number) {
  const [amount, setAmount] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setAmount(value), 400);
    return () => clearTimeout(t);
  }, [value]);
  return amount;
}

/** The host's final calculation for a pod. The waterfall runs on the FULL
 * collection (ticket price × number of pax) so the venue's fixed slot price is
 * deducted once for the pod — not once per booking — matching how the pod is
 * actually settled. */
export default function PricePanel({ slotPrice, podAmount, noOfSpots, venueId, isPhysical }: Readonly<Props>) {
  const { currency } = usePricing();
  const collection = podAmount > 0 && noOfSpots > 0 ? round2(podAmount * noOfSpots) : 0;
  const amount = useDebouncedAmount(collection);
  const hasVenue = isPhysical && slotPrice !== null;
  const { data, loading } = useQuery(POTENTIAL_POD_EARNINGS, {
    variables: { amount, venue_id: hasVenue ? venueId : null, venue_amount: hasVenue ? slotPrice : null },
    skip: amount <= 0,
    fetchPolicy: 'cache-and-network',
  });
  const w = data?.potentialPodEarnings;

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
    // During the debounce window the previous waterfall would render beside
    // labels built from the live inputs — treat it as loading instead.
    const stale = amount !== collection;
    if (!w || stale) {
      return loading || stale ? <CircularProgress size={18} /> : null;
    }
    return (
      <Stack spacing={0.75}>
        <Row
          label={`Total collection (${money(podAmount)} × ${noOfSpots})`}
          value={fmt(w.amount)}
          bold
          color="success.main"
        />
        <Row label={`− GST (${w.gst_pct}%)`} value={fmt(w.gst_amount)} />
        <Row label={`− Platform Fee (${w.platform_fee_pct}%)`} value={fmt(w.platform_fee_amount)} />
        {hasVenue && <Row label="− Venue slot price" value={fmt(w.venue_amount)} />}
        <Row label="Your Amount (remainder)" value={fmt(w.host_amount)} />
        <Row label={`− Your Commission (${w.host_commission_pct}%)`} value={fmt(w.host_commission_amount)} />
        <Row label="You Receive" value={fmt(w.host_receives)} bold color="success.main" />
        <Typography variant="caption" color="text.secondary">
          For {noOfSpots} pax · {w.host_earn_pct}% of collection
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
