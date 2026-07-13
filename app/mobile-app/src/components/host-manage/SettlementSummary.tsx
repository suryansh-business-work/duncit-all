import { Spinner, Text, XStack, YStack } from 'tamagui';

import type { PodSettlement } from '@/hooks/useSettlementPreview';

interface Props {
  settlement: PodSettlement | null;
  isLoading: boolean;
}

interface Line {
  label: string;
  value: number;
  strong?: boolean;
}

function SettlementRow({ symbol, line }: Readonly<{ symbol: string; line: Line }>) {
  return (
    <XStack justifyContent="space-between" testID={`settlement-row-${line.label}`}>
      <Text
        fontSize={12.5}
        color={line.strong ? '$color' : '$muted'}
        fontWeight={line.strong ? '900' : '700'}
      >
        {line.label}
      </Text>
      <Text
        fontSize={12.5}
        color={line.strong ? '$primary' : '$color'}
        fontWeight={line.strong ? '900' : '800'}
      >
        {symbol}
        {line.value.toFixed(2)}
      </Text>
    </XStack>
  );
}

/** "Host Share" preview of the reconciled split for the entered venue bill. */
export function SettlementSummary({ settlement, isLoading }: Readonly<Props>) {
  let body;
  if (settlement) {
    const w = settlement.waterfall;
    const lines: Line[] = [
      { label: 'Customer Paid', value: w.amount },
      { label: `− GST (${w.gst_pct}%)`, value: w.gst_amount },
      { label: `− Platform Fee (${w.platform_fee_pct}%)`, value: w.platform_fee_amount },
      { label: 'Pool', value: w.pool_amount },
    ];
    if (settlement.has_venue) {
      lines.push(
        { label: 'Venue price', value: w.venue_amount },
        { label: 'Venue receives', value: w.venue_receives },
      );
    }
    lines.push(
      { label: 'You receive', value: w.host_receives, strong: true },
      { label: 'Duncit revenue', value: w.duncit_revenue },
    );
    body = (
      <YStack gap={4}>
        {lines.map((line) => (
          <SettlementRow key={line.label} symbol={settlement.currency_symbol} line={line} />
        ))}
      </YStack>
    );
  } else {
    body = isLoading ? (
      <Spinner testID="settlement-loading" size="small" color="$primary" />
    ) : (
      <Text testID="settlement-empty" fontSize={12} color="$muted">
        Enter a bill to preview your share.
      </Text>
    );
  }

  return (
    <YStack
      gap={6}
      padding={12}
      borderRadius={12}
      backgroundColor="rgba(255,79,115,0.08)"
      testID="settlement-summary"
    >
      <Text fontSize={13} fontWeight="900" color="$color">
        Your share (after Finance approval)
      </Text>
      {body}
    </YStack>
  );
}
