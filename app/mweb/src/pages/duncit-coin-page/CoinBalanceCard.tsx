import { Box, Paper, Stack, Typography, useTheme } from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import { COIN_GOLD_TINT, coinGold } from '../../theme/coinGold';
import { useTranslation } from '../../i18n/useTranslation';
import { useDateFormat } from '../../utils/dateFormat';
import type { CoinBalance } from './queries';

interface Props {
  balance: CoinBalance | null;
  currencySymbol: string;
}

/** The soonest batch of coins to lapse, stated under the balance it will leave.
 * The icon carries the warning tint; the words stay body-coloured for contrast. */
function CoinExpiryNote({ coins, at }: Readonly<{ coins: number; at: string }>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.5 }}>
      <HourglassBottomIcon sx={{ fontSize: 16, color: 'warning.main' }} />
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        {t('mweb.coin.nextExpiry', { vars: { coins, date: formatDate(at) } })}
      </Typography>
    </Stack>
  );
}

/** The gold hero card: current balance, the next coins to expire, lifetime
 * earned and the live rates. */
export default function CoinBalanceCard({ balance, currencySymbol }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const gold = coinGold(theme.palette.mode);
  // Finance can switch the feedback reward off, and a line reading "You earn 0
  // Duncit Coins" promises nothing — so the rate decides whether it is stated.
  const feedbackCoins = balance?.pod_feedback_coins ?? 0;
  // The same rule for expiry: nothing due to lapse means nothing to say.
  const expiringCoins = balance?.expiring_coins ?? 0;
  const nextExpiryAt = balance?.next_expiry_at;

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
          {expiringCoins > 0 && nextExpiryAt ? (
            <CoinExpiryNote coins={expiringCoins} at={nextExpiryAt} />
          ) : null}
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
      {feedbackCoins > 0 && (
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: 'block',
            mt: 0.5
          }}>
          {t('mweb.coin.feedbackRateNote', { vars: { coins: feedbackCoins } })}
        </Typography>
      )}
    </Paper>
  );
}
