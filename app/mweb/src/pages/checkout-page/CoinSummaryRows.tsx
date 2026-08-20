import { Box, Stack, Typography, useTheme } from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import type { CoinCheckoutSummary } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { COIN_GOLD_TINT, coinGold } from '../../theme/coinGold';

/**
 * The Duncit Coin block under the payable — what this purchase spends, what is
 * left afterwards, and what it pays back.
 *
 * Inside the breakdown rather than only on the gold redeem row: a buyer reading
 * a total wants to know what it cost them in coins and what it gives back, and
 * a balance that changes after payment with nothing having said so reads as
 * coins going missing. Shared by the pod and product checkouts; the native twin
 * renders the same three numbers from the same `coinCheckoutSummary`.
 */
export default function CoinSummaryRows({
  coins,
}: Readonly<{ coins?: CoinCheckoutSummary | null }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const gold = coinGold(theme.palette.mode);
  if (!coins?.hasAny) return null;

  return (
    <Box
      sx={{
        mt: 1,
        p: 1.25,
        borderRadius: '16px',
        border: '1px solid',
        borderColor: gold,
        bgcolor: COIN_GOLD_TINT,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
        <MonetizationOnIcon sx={{ fontSize: 18, color: gold }} />
        <Typography variant="body2" fontWeight={700}>
          {t('mweb.coin.checkoutTitle')}
        </Typography>
      </Stack>
      {coins.used > 0 && (
        <CoinRow label={t('mweb.coin.checkoutUsed')} value={`− ${coins.used}`} />
      )}
      <CoinRow label={t('mweb.coin.checkoutRemaining')} value={String(coins.remaining)} />
      {coins.earning > 0 && (
        <CoinRow label={t('mweb.coin.checkoutEarning')} value={`+ ${coins.earning}`} />
      )}
    </Box>
  );
}

function CoinRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="caption" fontWeight={700}>
        {value}
      </Typography>
    </Stack>
  );
}
