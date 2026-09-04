import { Spinner, Text, XStack, YStack } from 'tamagui';

import type { PodSettlement } from '@/hooks/useSettlementPreview';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

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
        fontWeight={line.strong ? '700' : '600'}
      >
        {line.label}
      </Text>
      <Text
        fontSize={12.5}
        color={line.strong ? '$primary' : '$color'}
        fontWeight={line.strong ? '700' : '600'}
      >
        {symbol}
        {line.value.toFixed(2)}
      </Text>
    </XStack>
  );
}

/** "Host Share" preview of the reconciled split for the entered venue bill. */
export function SettlementSummary({ settlement, isLoading }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  // Hex-alpha-suffix tint pattern (same as CouponField/ClubTotalMembersSection) —
  // an 8% alpha channel on the resolved primary token instead of a hardcoded rgba.
  const primaryTint = `${primary}14`;
  let body;
  if (settlement) {
    const w = settlement.waterfall;
    const lines: Line[] = [
      { label: t('mweb.hostManage.customerPaid'), value: w.amount },
      { label: `− GST (${w.gst_pct}%)`, value: w.gst_amount },
      { label: `− Platform Fee (${w.platform_fee_pct}%)`, value: w.platform_fee_amount },
      { label: t('mweb.hostManage.pool'), value: w.pool_amount },
    ];
    if (settlement.has_venue) {
      lines.push(
        { label: t('mweb.hostManage.venuePrice'), value: w.venue_amount },
        { label: t('mweb.hostManage.venueReceives'), value: w.venue_receives },
      );
    }
    lines.push(
      // `host_payout_amount`, not `w.host_receives`: it is the number the
      // release will actually carry — floored at zero on a pod that took less
      // than the room cost, and zeroed outright once the completion window has
      // expired — so this line and the money that lands cannot differ. mWeb's
      // buildHostShareLines reads the same field.
      {
        label: t('mweb.hostManage.youReceive'),
        value: settlement.host_payout_amount,
        strong: true,
      },
      { label: t('mweb.hostManage.duncitRevenue'), value: w.duncit_revenue },
    );
    body = (
      <YStack gap={4}>
        {/* The head count these figures come from. A completed pod settles on
            what it actually collected, so this is real attendance, not the
            spots the host planned for — and their own seat was free. mWeb twin. */}
        <Text testID="settlement-attendees" fontSize={12} color="$muted">
          Based on {settlement.paying_attendees} paying{' '}
          {settlement.paying_attendees === 1 ? 'attendee' : 'attendees'} — your own spot is free.
        </Text>
        {lines.map((line) => (
          <SettlementRow key={line.label} symbol={settlement.currency_symbol} line={line} />
        ))}
        {settlement.complete_expired ? (
          <Text testID="settlement-expired" fontSize={12} color="$danger">
            {t('mweb.hostShare.expired')}
          </Text>
        ) : null}
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
      backgroundColor={primaryTint}
      testID="settlement-summary"
    >
      <Text fontSize={13} fontWeight="700" color="$color">
        Your share (credited to your wallet on completion)
      </Text>
      {body}
    </YStack>
  );
}
