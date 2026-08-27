import type { ReactNode } from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { DuncitButton } from '@duncit/buttons';
import { COIN_GOLD_TINT, coinGold } from '../../theme/coinGold';
import { useTranslation } from '../../i18n/useTranslation';
import type { CoinRedemption } from './useCoinRedemption';

interface RowProps {
  gold: string;
  caption: string;
  children?: ReactNode;
}

/** The gold row itself — icon, title, one line of state, one action. Hoisted so
 * each redemption state below is just a caption and a button. */
function CoinRow({ gold, caption, children }: Readonly<RowProps>) {
  const { t } = useTranslation();
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        justifyContent: "space-between",
        p: 1.25,
        borderRadius: '16px',
        bgcolor: COIN_GOLD_TINT,
        border: '1px solid',
        borderColor: gold
      }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          minWidth: 0
        }}>
        <MonetizationOnIcon fontSize="small" sx={{ color: gold, flexShrink: 0 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{
            fontWeight: 600
          }}>
            {t('mweb.coin.checkoutTitle')}
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {caption}
          </Typography>
        </Box>
      </Stack>
      {children}
    </Stack>
  );
}

/** Duncit Coin redemption for the payment step — the gold twin of CouponField.
 * Coins cut the gross before GST exactly like the coupon does, so applying is
 * all-or-nothing at the maximum the bill can absorb. */
export default function CoinRedeemField({ coins }: Readonly<{ coins: CoinRedemption }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const gold = coinGold(theme.palette.mode);

  if (coins.balance <= 0) {
    return <CoinRow gold={gold} caption={t('mweb.coin.checkoutNone')} />;
  }

  if (coins.applied > 0) {
    return (
      <CoinRow gold={gold} caption={t('mweb.coin.checkoutApplied', { vars: { coins: coins.applied } })}>
        <DuncitButton size="small" onClick={coins.onRemove} sx={{ color: gold, fontWeight: 700, flexShrink: 0 }}>
          {t('mweb.coin.checkoutRemove')}
        </DuncitButton>
      </CoinRow>
    );
  }

  return (
    <CoinRow gold={gold} caption={t('mweb.coin.checkoutAvailable', { vars: { coins: coins.balance } })}>
      <DuncitButton
        size="small"
        variant="outlined"
        onClick={coins.onApply}
        disabled={coins.max <= 0}
        sx={{ borderColor: gold, color: gold, fontWeight: 700, borderRadius: 999, flexShrink: 0 }}
      >
        {t('mweb.coin.checkoutApply')}
      </DuncitButton>
    </CoinRow>
  );
}
