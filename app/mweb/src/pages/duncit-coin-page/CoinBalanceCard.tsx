import { Box, Paper, Stack, Typography, useTheme } from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { COIN_GOLD_TINT, coinGold } from '../../theme/coinGold';
import { useTranslation } from '../../i18n/useTranslation';
import type { CoinBalance } from './queries';

interface Props {
  balance: CoinBalance | null;
  currencySymbol: string;
}

/** The gold hero card: current balance, lifetime earned and the live rate. */
export default function CoinBalanceCard({ balance, currencySymbol }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const gold = coinGold(theme.palette.mode);

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: '16px', borderColor: gold }}>
      <Stack direction="row" spacing={1.5} sx={{
        alignItems: "center"
      }}>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: '16px',
            display: 'grid',
            placeItems: 'center',
            color: gold,
            bgcolor: COIN_GOLD_TINT,
            flexShrink: 0,
          }}
        >
          <MonetizationOnIcon fontSize="large" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('mweb.coin.balanceLabel')}
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: gold,
              lineHeight: 1.2
            }}>
            {balance?.balance ?? 0}
          </Typography>
        </Box>
      </Stack>
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          mt: 2
        }}>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('mweb.coin.lifetimeLabel')}
        </Typography>
        <Typography variant="body2" sx={{
          fontWeight: 600
        }}>
          {balance?.lifetime_earned ?? 0}
        </Typography>
      </Stack>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          display: 'block',
          mt: 1.5
        }}>
        {t('mweb.coin.rateNote', {
          vars: {
            pct: balance?.earn_pct ?? 0,
            shopPct: balance?.shop_earn_pct ?? 0,
            symbol: currencySymbol,
          },
        })}
      </Typography>
    </Paper>
  );
}
