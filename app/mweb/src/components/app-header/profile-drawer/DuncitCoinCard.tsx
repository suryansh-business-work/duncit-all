import { useQuery } from '@apollo/client/react';
import { Box, Skeleton, Stack, Typography, useTheme } from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { COIN_TILE } from './profileSections';
import { MY_COIN_BALANCE } from '../../../pages/duncit-coin-page/queries';
import { SURFACE_SX } from '../../../theme';
import { COIN_GOLD_TINT, coinGold } from '../../../theme/coinGold';
import { useTranslation } from '../../../i18n/useTranslation';

/** The full-width Duncit Coin featured card (the coin's own gold, kept) — the
 * consumer's coin balance and the way into the ledger. User mode only. */
export default function DuncitCoinCard({ onNavigate }: Readonly<{ onNavigate: (to: string) => void }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const gold = coinGold(theme.palette.mode);
  const { data, loading } = useQuery<any>(MY_COIN_BALANCE, { fetchPolicy: 'cache-and-network' });
  // A balance of 0 is a real answer, so it must not be what the card shows
  // while the query is still deciding — it would tick up a beat later.
  const pending = loading && !data;
  const balance = data?.myCoinBalance?.balance ?? 0;
  const earnPct = data?.myCoinBalance?.earn_pct ?? 0;

  return (
    <Box sx={{ px: 2, pb: 1.5 }}>
      <Stack
        direction="row"
        spacing={1.5}
        onClick={() => onNavigate(COIN_TILE.to)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onNavigate(COIN_TILE.to);
        }}
        sx={{
          ...SURFACE_SX,
          p: 2,
          alignItems: 'center',
          cursor: 'pointer',
          transition: 'border-color 160ms ease',
          '&:hover': { borderColor: gold },
        }}
        aria-label={t('mweb.coin.title')}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '50%',
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
          <Typography noWrap sx={{ fontSize: 15, fontWeight: 600 }}>
            {t('mweb.coin.title')}
          </Typography>
          {pending ? (
            <Skeleton width="65%" height={18} />
          ) : (
            <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('mweb.coin.sidebarCaption', { vars: { pct: earnPct } })}
            </Typography>
          )}
        </Box>
        {pending ? (
          <Skeleton width={28} height={24} />
        ) : (
          <Typography noWrap sx={{ fontSize: 16, fontWeight: 700, color: gold }}>
            {balance}
          </Typography>
        )}
        <ChevronRightIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
      </Stack>
    </Box>
  );
}
