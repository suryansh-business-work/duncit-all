import { Box, Card, Stack, Typography, useTheme } from '@mui/material';
import CallMadeRoundedIcon from '@mui/icons-material/CallMadeRounded';
import CallReceivedRoundedIcon from '@mui/icons-material/CallReceivedRounded';
import { coinLedgerLabelKey } from '@duncit/utils';
import SectionHeader from '../../components/SectionHeader';
import { coinGold } from '../../theme/coinGold';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';
import type { CoinTransaction } from './queries';

/** The row's icon: a 40px soft disc with the in/out arrow. */
const DISC_SX = {
  width: 40,
  height: 40,
  flexShrink: 0,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  bgcolor: 'action.hover',
  color: 'text.secondary',
  '& svg': { fontSize: 20 },
} as const;

/** One ledger row. A CREDIT reads "+N" in gold, a DEBIT "−N" in the body colour
 * — the sign is what distinguishes them, so it is never colour alone. A grant
 * that expires says how long it lasts on a line of its own. */
function CoinRow({ txn, gold }: Readonly<{ txn: CoinTransaction; gold: string }>) {
  const { t } = useTranslation();
  const { formatDate, formatDateTime } = useDateFormat();
  const credit = txn.type === 'CREDIT';
  const label = t(coinLedgerLabelKey(txn));
  const sign = credit ? '+' : '−';
  const validTill = txn.expires_at
    ? t('mweb.coin.validTill', { vars: { date: formatDate(txn.expires_at) } })
    : null;

  return (
    <Stack
      component="li"
      direction="row"
      spacing={1.5}
      sx={{ alignItems: 'flex-start', py: 1.5, '& + &': { borderTop: 1, borderColor: 'divider' } }}
    >
      <Box sx={DISC_SX}>{credit ? <CallReceivedRoundedIcon /> : <CallMadeRoundedIcon />}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {txn.reason || label}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {`${label} · ${formatDateTime(txn.created_at)}`}
        </Typography>
        {validTill ? (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>
            {validTill}
          </Typography>
        ) : null}
      </Box>
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
    </Stack>
  );
}

interface Props {
  transactions: readonly CoinTransaction[];
}

export default function CoinHistoryList({ transactions }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const gold = coinGold(theme.palette.mode);

  return (
    <Stack spacing={1.25}>
      <SectionHeader title={t('mweb.coin.historyTitle')} />
      <Card sx={{ px: 2, py: 0.5 }}>
        {transactions.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 1.5 }}>
            {t('mweb.coin.historyEmpty')}
          </Typography>
        ) : (
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {transactions.map((txn) => (
              <CoinRow key={txn.id} txn={txn} gold={gold} />
            ))}
          </Box>
        )}
      </Card>
    </Stack>
  );
}
