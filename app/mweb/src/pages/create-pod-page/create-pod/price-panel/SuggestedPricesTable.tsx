import { Box, Stack, Typography } from '@mui/material';
import { formatMoney } from '@duncit/utils';
import type { SuggestedTicketPrice } from './queries';
import { SUGGESTED_PRICE_TIER_KEYS } from './pricingCopy';
import { useTranslation } from '../../../../i18n/useTranslation';

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
      data-testid={testId}
      sx={{
        justifyContent: "space-between",
        alignItems: "flex-start",
        px: 1.5,
        py: 1.125,
        borderTop: 1,
        borderColor: 'divider'
      }}>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{
          fontWeight: 600
        }}>
          {price}
        </Typography>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {description}
        </Typography>
      </Box>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          color: "success.main",
          whiteSpace: 'nowrap'
        }}>
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
  const { t } = useTranslation();
  const lastIndex = prices.length - 1;
  // The server caps the ladder at 5 rows, so a higher index only happens if
  // that cap ever moves — it degrades to no line.
  const tierText = (index: number) => {
    const key = SUGGESTED_PRICE_TIER_KEYS[index];
    return key ? t(key) : '';
  };
  return (
    <Box
      data-testid="suggested-prices-table"
      sx={{ border: 1, borderColor: 'divider', borderRadius: '16px', overflow: 'hidden' }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          justifyContent: "space-between",
          px: 1.5,
          py: 1.125,
          bgcolor: 'action.hover'
        }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: "text.secondary"
          }}>
          {t('mweb.createPod.suggestedPrice')}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: "text.secondary"
          }}>
          {t('mweb.createPod.whatYouGet')}
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
            description={tierText(index)}
          />
        );
      })}
    </Box>
  );
}
