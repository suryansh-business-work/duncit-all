import { Box, Stack, Typography } from '@mui/material';
import { formatMoney } from '@duncit/utils';
import type { SuggestedTicketPrice } from './queries';
import {
  SUGGESTED_PRICES_PAYOUT_COLUMN,
  SUGGESTED_PRICES_PRICE_COLUMN,
  tierDescription,
} from './pricingCopy';

interface RowProps {
  price: string;
  payout: string;
  description: string;
  testId: string;
}

/** One ladder row: the candidate price with its tier description, and the
 * host's projected take-home at that price. */
function SuggestedPriceRow({ price, payout, description, testId }: Readonly<RowProps>) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      justifyContent="space-between"
      alignItems="flex-start"
      data-testid={testId}
      sx={{ px: 1.5, py: 1.125, borderTop: 1, borderColor: 'divider' }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" fontWeight={800}>
          {price}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      </Box>
      <Typography
        variant="body2"
        fontWeight={900}
        color="success.main"
        sx={{ whiteSpace: 'nowrap' }}
      >
        {payout}
      </Typography>
    </Stack>
  );
}

interface Props {
  prices: SuggestedTicketPrice[];
  symbol: string;
}

/** The two-column suggestions table — Suggested Price | What You Get. The top
 * rung is the open end of the ladder, so it reads "₹499+". Native twin. */
export default function SuggestedPricesTable({ prices, symbol }: Readonly<Props>) {
  const lastIndex = prices.length - 1;
  return (
    <Box
      data-testid="suggested-prices-table"
      sx={{ border: 1, borderColor: 'divider', borderRadius: '4px', overflow: 'hidden' }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        justifyContent="space-between"
        sx={{ px: 1.5, py: 1.125, bgcolor: 'action.hover' }}
      >
        <Typography variant="caption" fontWeight={900} color="text.secondary">
          {SUGGESTED_PRICES_PRICE_COLUMN}
        </Typography>
        <Typography variant="caption" fontWeight={900} color="text.secondary">
          {SUGGESTED_PRICES_PAYOUT_COLUMN}
        </Typography>
      </Stack>
      {prices.map((row, index) => {
        const openEnded = index === lastIndex;
        const price = `${formatMoney(row.price, { symbol })}${openEnded ? '+' : ''}`;
        return (
          <SuggestedPriceRow
            key={row.price}
            testId={`suggested-price-${row.price}`}
            price={price}
            payout={formatMoney(row.host_receives, { symbol })}
            description={tierDescription(index)}
          />
        );
      })}
    </Box>
  );
}
