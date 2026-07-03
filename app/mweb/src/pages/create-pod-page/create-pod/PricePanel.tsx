import { Card, Divider, Stack, Typography } from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import { usePricing } from '../../../hooks/usePricing';

interface Props {
  slotPrice: number | null;
  podAmount: number;
  spots: number;
  isPhysical: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Slot cost + GST and estimated earnings for the host — venue slot price and
 * GST come from the Finance portal settings, earnings from spots × ticket. */
export default function PricePanel({ slotPrice, podAmount, spots, isPhysical }: Readonly<Props>) {
  const { gstPct, currency, compute } = usePricing();

  const money = (value: number) => `${currency}${round2(value).toLocaleString('en-IN')}`;
  const slotGst = slotPrice ? round2((slotPrice * gstPct) / 100) : 0;
  const slotTotal = (slotPrice ?? 0) + slotGst;
  const grossRevenue = round2(Math.max(0, podAmount) * Math.max(0, spots));
  // Per-ticket net after platform fee + GST (inclusive model), scaled by spots.
  const netPerTicket = compute(podAmount).subtotal;
  const netRevenue = round2(netPerTicket * Math.max(0, spots));
  const potential = round2(netRevenue - (isPhysical ? slotTotal : 0));

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
        <Row label={`Ticket revenue if full (${Math.max(0, spots)} × ${money(podAmount)})`} value={money(grossRevenue)} />
        <Row label="After platform fee & GST" value={money(netRevenue)} />
        <Row label="Potential earnings" value={money(Math.max(0, potential))} bold />
        <Typography variant="caption" color="text.secondary">
          Estimates before host-share deductions — final settlement happens after the pod completes.
        </Typography>
      </Stack>
    </Card>
  );
}

function Row({ label, value, bold = false }: Readonly<{ label: string; value: string; bold?: boolean }>) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" color={bold ? 'text.primary' : 'text.secondary'} fontWeight={bold ? 800 : 500}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={bold ? 900 : 700}>
        {value}
      </Typography>
    </Stack>
  );
}
