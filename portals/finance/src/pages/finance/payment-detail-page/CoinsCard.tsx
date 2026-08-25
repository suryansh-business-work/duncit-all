import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { InfoRow, StatusChip, type StatusColorMap } from '@duncit/ui';
import { useTranslation, type DateFormatter } from '@duncit/app-settings';
import type { PaymentCoinLine } from './queries';

const COIN_TYPE_COLORS: StatusColorMap = {
  CREDIT: 'success',
  DEBIT: 'warning',
};

/** Ledger rows carry an unsigned amount; the sign comes from the movement type. */
const COIN_SIGNS: Record<string, string> = {
  CREDIT: '+',
  DEBIT: '−',
};

// A ledger row has no id of its own, and one payment writes at most one
// movement per type — type + instant is therefore a stable row key.
const coinLineKey = (line: PaymentCoinLine) => `${line.type}-${line.at}`;

interface Props {
  coins: PaymentCoinLine[];
  coinsRedeemed: number;
  coinsEarned: number;
  formatDateTime: DateFormatter['formatDateTime'];
}

/**
 * Duncit Coin movements this payment caused. The card is rendered even with no
 * movements — Finance needs to see the absence, not an absent card.
 */
export default function CoinsCard({ coins, coinsRedeemed, coinsEarned, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, flex: 1, minWidth: 300, width: '100%' }}>
      <CardContent>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            mb: 1.5
          }}>
          {t('finance.payment.coinsTitle')}
        </Typography>
        <Stack spacing={1}>
          <InfoRow variant="split" label={t('finance.payment.coinsSpent')} value={String(coinsRedeemed)} />
          <InfoRow variant="split" label={t('finance.payment.coinsEarned')} value={String(coinsEarned)} />
        </Stack>
        <Divider sx={{ my: 1.5 }} />

        {coins.length === 0 && (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('finance.payment.coinsEmpty')}
          </Typography>
        )}

        <Stack spacing={1.25} divider={<Divider flexItem />}>
          {coins.map((line) => (
            <Stack key={coinLineKey(line)} spacing={0.5}>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                <StatusChip status={line.type} colorMap={COIN_TYPE_COLORS} />
                <Typography variant="body2" sx={{
                  fontWeight: 700
                }}>
                  {COIN_SIGNS[line.type] ?? ''}
                  {line.amount}
                </Typography>
              </Stack>
              <InfoRow variant="split" label={t('finance.payment.balanceAfter')} value={String(line.balance_after)} />
              <InfoRow variant="split" label={t('finance.payment.coinSource')} value={line.source} />
              <InfoRow variant="split" label={t('finance.payment.coinReason')} value={line.reason} />
              {line.earn_pct > 0 && (
                <InfoRow variant="split" label={t('finance.payment.earnRate')} value={`${line.earn_pct}%`} />
              )}
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {formatDateTime(line.at)}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
