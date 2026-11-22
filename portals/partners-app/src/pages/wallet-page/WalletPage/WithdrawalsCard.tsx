import { Alert, Box, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { STATUS_COLOR, fmtDate, type WalletWithdrawal } from './helpers';

interface Props {
  withdrawals: WalletWithdrawal[];
  currency: string;
}

/** An id line: full, wrapping and selectable, so it can be copied into a bank or Razorpay search. */
const PAYOUT_REF_SX = { color: 'text.secondary', display: 'block', wordBreak: 'break-all', userSelect: 'text' } as const;

export default function WithdrawalsCard({ withdrawals, currency }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Card variant="outlined" sx={{ borderRadius: 4 }}>
      <CardContent>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 950, mb: 1 }}>
          Withdrawals
        </Typography>
        <Divider sx={{ mb: 1.5 }} />
        {withdrawals.length === 0 ? (
          <Alert severity="info" data-testid="wallet-withdrawals-empty">{t('partners.walletPage.noWithdrawalsYet')}</Alert>
        ) : (
          <Stack spacing={1}>
            {withdrawals.map((w) => (
              <Stack key={w.id} data-testid={`wallet-withdrawal-${w.id}`} direction="row" spacing={1} sx={{
                alignItems: "center"
              }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{
                    fontWeight: 700
                  }}>
                    {currency}
                    {w.amount.toFixed(2)} · {w.payout_method}
                  </Typography>
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      color: "text.secondary",
                      display: "block"
                    }}>
                    Requested {fmtDate(w.created_at)}
                    {w.reject_reason ? ` · ${w.reject_reason}` : ''}
                  </Typography>
                  {/* The payment's own ids, once Razorpay and the bank have them. */}
                  {w.razorpay_payout_id ? (
                    <Typography variant="caption" sx={PAYOUT_REF_SX} data-testid={`wallet-withdrawal-payout-${w.id}`}>
                      {t('withdraw.history.paymentId', { vars: { id: w.razorpay_payout_id } })}
                    </Typography>
                  ) : null}
                  {w.payout_utr ? (
                    <Typography variant="caption" sx={PAYOUT_REF_SX} data-testid={`wallet-withdrawal-utr-${w.id}`}>
                      {t('withdraw.history.utr', { vars: { utr: w.payout_utr } })}
                    </Typography>
                  ) : null}
                </Box>
                <Chip size="small" color={STATUS_COLOR[w.status] ?? 'default'} label={w.status} />
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
