import { useEffect, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Card, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import { usePricing } from '../../../hooks/usePricing';

/** Server-side potential-earnings waterfall for a hypothetical ticket price. */
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
  venueId: string | null;
  isPhysical: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Debounced (400ms) copy of the ticket price so typing doesn't spam the API. */
function useDebouncedAmount(podAmount: number) {
  const [amount, setAmount] = useState(podAmount);
  useEffect(() => {
    const t = setTimeout(() => setAmount(podAmount), 400);
    return () => clearTimeout(t);
  }, [podAmount]);
  return amount;
}

/** Slot cost + GST (venue side, unchanged) and the server-computed potential
 * earnings waterfall for the host — potentialPodEarnings, per booking. */
export default function PricePanel({ slotPrice, podAmount, venueId, isPhysical }: Readonly<Props>) {
  const { gstPct, currency } = usePricing();
  const amount = useDebouncedAmount(podAmount);
  const hasVenue = isPhysical && !!venueId;
  const { data, loading } = useQuery(POTENTIAL_POD_EARNINGS, {
    variables: { amount, venue_id: hasVenue ? venueId : null, venue_amount: hasVenue ? slotPrice : null },
    skip: amount <= 0,
    fetchPolicy: 'cache-and-network',
  });
  const w = data?.potentialPodEarnings;

  const money = (value: number) => `${currency}${round2(value).toLocaleString('en-IN')}`;
  const fmt = (value: number) => `${currency}${(Number(value) || 0).toFixed(2)}`;
  const slotGst = slotPrice ? round2((slotPrice * gstPct) / 100) : 0;
  const slotTotal = (slotPrice ?? 0) + slotGst;

  const breakdown = () => {
    if (podAmount <= 0) {
      return (
        <Typography variant="caption" color="text.secondary">
          Set a ticket price to preview your earnings.
        </Typography>
      );
    }
    if (!w) {
      return loading ? <CircularProgress size={18} /> : null;
    }
    return (
      <Stack spacing={0.75}>
        <Row label="Customer Pays" value={fmt(w.amount)} />
        <Row label={`− GST (${w.gst_pct}%)`} value={fmt(w.gst_amount)} />
        <Row label={`− Platform Fee (${w.platform_fee_pct}%)`} value={fmt(w.platform_fee_amount)} />
        {hasVenue && <Row label="− Venue slot price" value={fmt(w.venue_amount)} />}
        <Row label="Your Amount (remainder)" value={fmt(w.host_amount)} />
        <Row label={`− Your Commission (${w.host_commission_pct}%)`} value={fmt(w.host_commission_amount)} />
        <Row label="You Receive" value={fmt(w.host_receives)} bold color="success.main" />
        <Typography variant="caption" color="text.secondary">
          ({w.host_earn_pct}% of customer amount) · per booking
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
            Slot cost & potential earnings
          </Typography>
        </Stack>
        {isPhysical && (
          <>
            <Row label="Venue slot price" value={slotPrice === null ? 'Pick a slot first' : money(slotPrice)} />
            <Row label={`GST on slot (${gstPct}%)`} value={slotPrice === null ? '—' : money(slotGst)} />
            <Row label="Total venue cost" value={slotPrice === null ? '—' : money(slotTotal)} bold />
            <Divider />
          </>
        )}
        <Typography variant="caption" fontWeight={800} color="text.secondary">
          Quick Breakdown (per booking)
        </Typography>
        {breakdown()}
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
