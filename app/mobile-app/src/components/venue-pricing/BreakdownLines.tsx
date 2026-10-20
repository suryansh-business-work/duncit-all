import { Text, XStack, YStack } from 'tamagui';
import { formatMoney } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';

/** The slice of `VenuePriceBreakdown` the lines read — every quote selection carries it. */
export interface BreakdownView {
  base: number;
  rules: readonly { label: string; amount: number }[];
  min_spend_top_up: number;
  cleaning_fee: number;
  pet_fee: number;
  taxes: number;
  venue_payout: number;
  platform_fee: number;
  total: number;
  deposit: number;
}

function Line({
  label,
  amount,
  strong = false,
  testID,
}: Readonly<{ label: string; amount: number; strong?: boolean; testID: string }>) {
  const weight = strong ? '700' : '400';
  return (
    <XStack justifyContent="space-between" gap={12} testID={testID}>
      <Text flex={1} fontSize={13} fontWeight={weight} color="$color">
        {label}
      </Text>
      <Text fontSize={13} fontWeight={weight} color="$color">
        {formatMoney(amount, { decimals: 2 })}
      </Text>
    </XStack>
  );
}

/**
 * A server quote, line by line: what the venue receives (exactly its own
 * price, plus GST when it charges it) and Duncit's fee added on top for the
 * host. The deposit is refundable and paid at the venue, so it sits outside
 * the total. Zero lines are left out.
 */
export function BreakdownLines({
  breakdown,
  testID,
}: Readonly<{ breakdown: BreakdownView; testID: string }>) {
  const { t } = useTranslation();
  const optional = [
    {
      key: 'top-up',
      label: t('availability.pricingModule.breakdown.minSpendTopUp'),
      amount: breakdown.min_spend_top_up,
    },
    {
      key: 'cleaning',
      label: t('availability.pricingModule.breakdown.cleaningFee'),
      amount: breakdown.cleaning_fee,
    },
    {
      key: 'pet',
      label: t('availability.pricingModule.breakdown.petFee'),
      amount: breakdown.pet_fee,
    },
    { key: 'gst', label: t('availability.pricingModule.breakdown.taxes'), amount: breakdown.taxes },
  ].filter((line) => line.amount !== 0);

  return (
    <YStack gap={6} testID={testID}>
      <Line
        label={t('availability.pricingModule.breakdown.base')}
        amount={breakdown.base}
        testID={`${testID}-base`}
      />
      {breakdown.rules.map((rule, index) => (
        <Line
          key={`${rule.label}-${index}`}
          label={rule.label}
          amount={rule.amount}
          testID={`${testID}-rule-${index}`}
        />
      ))}
      {optional.map((line) => (
        <Line
          key={line.key}
          label={line.label}
          amount={line.amount}
          testID={`${testID}-${line.key}`}
        />
      ))}
      <YStack height={1} backgroundColor="$borderColor" />
      <Line
        label={t('availability.pricingModule.breakdown.venueReceives')}
        amount={breakdown.venue_payout}
        strong
        testID={`${testID}-payout`}
      />
      <Line
        label={t('availability.pricingModule.breakdown.platformFee')}
        amount={breakdown.platform_fee}
        testID={`${testID}-fee`}
      />
      <Line
        label={t('availability.pricingModule.breakdown.total')}
        amount={breakdown.total}
        strong
        testID={`${testID}-total`}
      />
      {breakdown.deposit > 0 ? (
        <Line
          label={t('availability.pricingModule.breakdown.deposit')}
          amount={breakdown.deposit}
          testID={`${testID}-deposit`}
        />
      ) : null}
    </YStack>
  );
}
