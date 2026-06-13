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
  if (!settlement) {
    body = isLoading ? (
      <Spinner testID="settlement-loading" size="small" color="$primary" />
    ) : (
      <Text testID="settlement-empty" fontSize={12} color="$muted">
        Enter a bill to preview your share.
      </Text>
    );
  } else {
    const lines: Line[] = [
      { label: 'Total collected', value: settlement.collected_total },
      { label: 'Venue bill', value: settlement.host.venue_bill },
      { label: `GST (${settlement.host.gst_pct}%)`, value: settlement.host.gst_amount },
      {
        label: `Duncit Taken (${settlement.host.duncit_pct}%)`,
        value: settlement.host.duncit_amount,
      },
      {
        label: `Your Commission (${settlement.host.payout_pct}%)`,
        value: settlement.host.payout_amount,
        strong: true,
      },
    ];
    body = (
      <YStack gap={4}>
        {lines.map((line) => (
          <SettlementRow key={line.label} symbol={settlement.currency_symbol} line={line} />
        ))}
      </YStack>
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
        Your share (after approval)
      </Text>
      {body}
    </YStack>
  );
}
