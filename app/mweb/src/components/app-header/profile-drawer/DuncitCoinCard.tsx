import { useQuery } from '@apollo/client';
import { Box, Paper, Stack, Typography, useTheme } from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { COIN_TILE } from './profileSections';
import { MY_COIN_BALANCE } from '../../../pages/duncit-coin-page/queries';
import { COIN_GOLD_TINT, coinGold } from '../../../theme/coinGold';
import { useTranslation } from '../../../i18n/useTranslation';

/** The full-width Duncit Coin featured card (gold accent) — the consumer's coin
 * balance and the way into the ledger. Rendered in User mode only. */
export default function DuncitCoinCard({ onNavigate }: Readonly<{ onNavigate: (to: string) => void }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const gold = coinGold(theme.palette.mode);
  const { data } = useQuery(MY_COIN_BALANCE, { fetchPolicy: 'cache-and-network' });
  const balance = data?.myCoinBalance?.balance ?? 0;
  const earnPct = data?.myCoinBalance?.earn_pct ?? 0;

  return (
    <Box sx={{ px: 2, pb: 1.25 }}>
      <Paper
        variant="outlined"
        onClick={() => onNavigate(COIN_TILE.to)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onNavigate(COIN_TILE.to);
        }}
        sx={{
          p: 1.5,
          borderRadius: '16px',
          cursor: 'pointer',
          transition: 'border-color 160ms ease',
          '&:hover': { borderColor: gold },
        }}
        aria-label={t('mweb.coin.title')}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '16px',
              display: 'grid',
              placeItems: 'center',
              color: gold,
              bgcolor: COIN_GOLD_TINT,
              flexShrink: 0,
            }}
          >
            <MonetizationOnIcon />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography fontWeight={600} noWrap>
              {t('mweb.coin.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {t('mweb.coin.sidebarCaption', { vars: { pct: earnPct } })}
            </Typography>
          </Box>
          <Typography fontWeight={700} sx={{ color: gold }} noWrap>
            {balance}
          </Typography>
          <ChevronRightIcon color="disabled" />
        </Stack>
      </Paper>
    </Box>
  );
}
