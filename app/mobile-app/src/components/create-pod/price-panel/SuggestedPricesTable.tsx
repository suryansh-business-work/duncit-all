import { Text, XStack, YStack } from 'tamagui';
import { formatMoney } from '@duncit/utils';

import type { SuggestedTicketPrice } from '@/hooks/useSuggestedTicketPrices';
import {
  SUGGESTED_PRICES_PAYOUT_COLUMN,
  SUGGESTED_PRICES_PRICE_COLUMN,
  tierDescription,
} from './step4-copy';

interface RowProps {
  price: string;
  payout: string;
  description: string;
  testID: string;
}

/** One ladder row: the candidate price with its tier description, and the
 * host's projected take-home at that price. */
function SuggestedPriceRow({ price, payout, description, testID }: Readonly<RowProps>) {
  return (
    <XStack
      testID={testID}
      justifyContent="space-between"
      alignItems="flex-start"
      gap={12}
      paddingHorizontal={12}
      paddingVertical={9}
      borderTopWidth={1}
      borderTopColor="$borderColor"
    >
      <YStack flex={1} minWidth={0} gap={2}>
        <Text fontSize={14} fontWeight="600" color="$color">
          {price}
        </Text>
        <Text fontSize={11} color="$muted">
          {description}
        </Text>
      </YStack>
      <Text fontSize={14} fontWeight="700" color="$success">
        {payout}
      </Text>
    </XStack>
  );
}

interface Props {
  prices: SuggestedTicketPrice[];
  symbol: string;
}

/** The two-column suggestions table — Suggested Price | What You Get. The
 * top rung is the open end of the ladder, so it reads "₹499+". mWeb twin. */
export function SuggestedPricesTable({ prices, symbol }: Readonly<Props>) {
  const lastIndex = prices.length - 1;
  return (
    <YStack
      testID="suggested-prices-table"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={12}
      overflow="hidden"
    >
      <XStack
        justifyContent="space-between"
        gap={12}
        paddingHorizontal={12}
        paddingVertical={9}
        backgroundColor="$surface"
      >
        <Text fontSize={12} fontWeight="700" color="$muted">
          {SUGGESTED_PRICES_PRICE_COLUMN}
        </Text>
        <Text fontSize={12} fontWeight="700" color="$muted">
          {SUGGESTED_PRICES_PAYOUT_COLUMN}
        </Text>
      </XStack>
      {prices.map((row, index) => {
        const openEnded = index === lastIndex;
        const price = `${formatMoney(row.price, { symbol })}${openEnded ? '+' : ''}`;
        return (
          <SuggestedPriceRow
            key={row.price}
            testID={`suggested-price-${row.price}`}
            price={price}
            payout={formatMoney(row.host_receives, { symbol })}
            description={tierDescription(index)}
          />
        );
      })}
    </YStack>
  );
}
