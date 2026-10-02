import { Alert, Box, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { fmtDate, type WalletTransaction } from './helpers';

interface Props {
  transactions: WalletTransaction[];
  currency: string;
}

export default function TransactionsCard({ transactions, currency }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Card variant="outlined" sx={{ borderRadius: 4 }}>
      <CardContent>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 950, mb: 1 }}>
          Transactions
        </Typography>
        <Divider sx={{ mb: 1.5 }} />
        {transactions.length === 0 ? (
          <Alert severity="info">{t('partners.walletPage.yourPayoutsWillShowUpHere')}</Alert>
        ) : (
          <Stack spacing={1}>
            {transactions.map((t) => (
              <Stack key={t.id} direction="row" spacing={1} sx={{
                alignItems: "center"
              }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{
                    fontWeight: 700
                  }}>
                    {t.reason || t.source}
                  </Typography>
                  <Typography variant="caption" sx={{
                    color: "text.secondary"
                  }}>
                    {fmtDate(t.created_at)}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color={t.type === 'CREDIT' ? 'success.main' : 'error.main'}
                  sx={{
                    fontWeight: 900
                  }}
                >
                  {t.type === 'CREDIT' ? '+' : '−'}
                  {currency}
                  {t.amount.toFixed(2)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
