import { Text, XStack, YStack } from 'tamagui';

import type { CreatePodFinance } from './create-pod.types';

interface Props {
  finance: CreatePodFinance;
  slotPrice: number | null;
  podAmount: number;
  spots: number;
  isPhysical: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Slot cost + GST and estimated earnings — venue slot price and GST come from
 * the Finance portal settings, earnings from spots × ticket. mWeb twin. */
export function PricePanel({ finance, slotPrice, podAmount, spots, isPhysical }: Readonly<Props>) {
  const money = (value: number) => `${finance.currency_symbol}${round2(value)}`;
  const slotGst = slotPrice ? round2((slotPrice * finance.gst_pct) / 100) : 0;
  const slotTotal = (slotPrice ?? 0) + slotGst;
  const grossRevenue = round2(Math.max(0, podAmount) * Math.max(0, spots));
  // Per-ticket net after platform fee + GST (inclusive model), scaled by
  // spots. The divisor is always ≥ 1 for non-negative percentages.
  const divisor = (1 + finance.platform_fee_pct / 100) * (1 + finance.gst_pct / 100);
  const netPerTicket = podAmount / divisor;
  const netRevenue = round2(Math.max(0, netPerTicket) * Math.max(0, spots));
  const potential = round2(netRevenue - (isPhysical ? slotTotal : 0));

  return (
    <YStack
      testID="create-pod-price-panel"
      gap={8}
      padding={14}
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={12}
    >
      <Text fontSize={14} fontWeight="900" color="$color">
        Slot cost & potential earnings
      </Text>
      {isPhysical ? (
        <>
          <Row label="Venue slot price" value={slotPrice === null ? 'Pick a slot first' : money(slotPrice)} />
          <Row label={`GST on slot (${finance.gst_pct}%)`} value={slotPrice === null ? '—' : money(slotGst)} />
          <Row label="Total venue cost" value={slotPrice === null ? '—' : money(slotTotal)} bold />
        </>
      ) : null}
      <Row label={`Ticket revenue if full (${Math.max(0, spots)} × ${money(podAmount)})`} value={money(grossRevenue)} />
      <Row label="After platform fee & GST" value={money(netRevenue)} />
      <Row label="Potential earnings" value={money(Math.max(0, potential))} bold />
      <Text fontSize={11.5} color="$muted">
        Estimates before host-share deductions — final settlement happens after the pod completes.
      </Text>
    </YStack>
  );
}

function Row({ label, value, bold = false }: Readonly<{ label: string; value: string; bold?: boolean }>) {
  return (
    <XStack justifyContent="space-between" gap={12}>
      <Text fontSize={13} color={bold ? '$color' : '$muted'} fontWeight={bold ? '800' : '500'} flexShrink={1}>
        {label}
      </Text>
      <Text fontSize={13} fontWeight={bold ? '900' : '700'} color="$color">
        {value}
      </Text>
    </XStack>
  );
}
