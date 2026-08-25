import { Divider, List, ListItem, ListItemText, Stack, Typography, useTheme } from '@mui/material';
import { coinGold } from '../../theme/coinGold';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';
import type { CoinTransaction } from './queries';

/** One ledger row. A CREDIT reads "+N" in gold, a DEBIT "−N" in the body colour
 * — the sign is what distinguishes them, so it is never colour alone. */
function CoinRow({ txn, gold }: Readonly<{ txn: CoinTransaction; gold: string }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const credit = txn.type === 'CREDIT';
  const label = credit ? t('mweb.coin.earned') : t('mweb.coin.redeemed');
  const sign = credit ? '+' : '−';

  return (
    <ListItem disableGutters sx={{ alignItems: 'flex-start' }}>
      <ListItemText
        primary={txn.reason || label}
        secondary={`${label} · ${formatDateTime(txn.created_at)}`}
        slotProps={{
          primary: { variant: 'body2', sx: { fontWeight: 600 } },
          secondary: { variant: 'caption' }
        }} />
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          color: credit ? gold : 'text.primary',
          whiteSpace: 'nowrap',
          pl: 1
        }}>
        {sign}
        {txn.amount}
      </Typography>
    </ListItem>
  );
}

interface Props {
  transactions: readonly CoinTransaction[];
}

export default function CoinHistoryList({ transactions }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const gold = coinGold(theme.palette.mode);

  if (transactions.length === 0) {
    return (
      <Stack spacing={1}>
        <Typography variant="subtitle2">{t('mweb.coin.historyTitle')}</Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('mweb.coin.historyEmpty')}
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{t('mweb.coin.historyTitle')}</Typography>
      <List disablePadding>
        {transactions.map((txn, index) => (
          <Stack key={txn.id}>
            {index > 0 && <Divider component="li" />}
            <CoinRow txn={txn} gold={gold} />
          </Stack>
        ))}
      </List>
    </Stack>
  );
}
