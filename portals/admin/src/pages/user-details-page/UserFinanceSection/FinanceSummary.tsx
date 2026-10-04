import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { EM_DASH } from '@duncit/table';
import { formatMoney, parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { USER_FINANCE_SUMMARY } from './queries';

interface TileProps {
  label: string;
  value: string;
  lines: string[];
  testId: string;
  emphasis?: boolean;
}

function Tile({ label, value, lines, testId, emphasis = false }: Readonly<TileProps>) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 0 }} data-testid={testId}>
      <Typography variant="overline" component="p" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
        {label}
      </Typography>
      <Typography
        variant={emphasis ? 'h5' : 'h6'}
        component="p"
        sx={{ fontWeight: 800, color: emphasis ? 'primary.main' : 'text.primary', overflowWrap: 'anywhere' }}
      >
        {value}
      </Typography>
      {lines.map((line) => (
        <Typography key={line} variant="caption" component="p" sx={{ color: 'text.secondary' }}>
          {line}
        </Typography>
      ))}
    </Paper>
  );
}

const Grid = ({ children }: Readonly<{ children: ReactNode }>) => (
  <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2, minmax(0,1fr))', lg: 'repeat(4, minmax(0,1fr))' } }}>
    {children}
  </Box>
);

/** How much business the account has given Duncit, what it got back, and its coin wallet. */
export default function FinanceSummary({ userId }: Readonly<{ userId: string }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { data, loading, error } = useQuery(USER_FINANCE_SUMMARY, {
    variables: { user_id: userId },
    skip: !userId,
    fetchPolicy: 'cache-and-network',
  });
  const s = data?.userFinanceSummary;

  if (loading && !s) {
    return (
      <Grid>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={112} />
        ))}
      </Grid>
    );
  }
  if (error && !s) return <Alert severity="error">{`${t('admin.userFinance.summaryFailed')} ${parseApiError(error)}`}</Alert>;
  if (!s) return null;

  const money = (value: number) => formatMoney(value, { symbol: s.currency_symbol ?? undefined, decimals: 2 });
  const lastPaid = s.last_paid_at
    ? t('admin.userFinance.lastPaid', { vars: { when: formatDateTime(s.last_paid_at) } })
    : t('admin.userFinance.neverPaid');
  const coins = s.coins;

  return (
    <Stack spacing={1.5}>
      <Stack spacing={0.25}>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
          {t('admin.userFinance.summaryTitle')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('admin.userFinance.summaryHint')}
        </Typography>
      </Stack>
      <Grid>
        <Tile emphasis testId="user-finance-net" label={t('admin.userFinance.netBusiness')} value={money(s.net_business)} lines={[lastPaid]} />
        <Tile
          testId="user-finance-paid"
          label={t('admin.userFinance.paidTotal')}
          value={money(s.paid_total)}
          lines={[
            t('admin.userFinance.paidCount', { vars: { count: s.payment_count } }),
            t('admin.userFinance.failedCount', { vars: { count: s.failed_count } }),
          ]}
        />
        <Tile
          testId="user-finance-refunded"
          label={t('admin.userFinance.refundedTotal')}
          value={money(s.refunded_total)}
          lines={[t('admin.userFinance.refundCount', { vars: { count: s.refund_count } })]}
        />
        {coins ? (
          <Tile
            testId="user-finance-coins"
            label={t('admin.userFinance.coinBalance')}
            value={String(coins.balance)}
            lines={[
              t('admin.userFinance.coinLifetime', { vars: { coins: coins.lifetime_earned } }),
              `${t('admin.userFinance.coinsCredited')}: ${coins.credited} · ${t('admin.userFinance.coinsDebited')}: ${coins.debited}`,
              t('admin.userFinance.coinsRedeemed', { vars: { coins: s.coins_redeemed } }),
            ]}
          />
        ) : (
          <Tile testId="user-finance-coins" label={t('admin.userFinance.coinBalance')} value={EM_DASH} lines={[t('admin.userFinance.coinsHidden')]} />
        )}
      </Grid>
    </Stack>
  );
}
