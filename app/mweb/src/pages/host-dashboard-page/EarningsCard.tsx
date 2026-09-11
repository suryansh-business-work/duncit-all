import { Link as RouterLink } from 'react-router';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PaymentsIcon from '@mui/icons-material/Payments';
import { DuncitButton } from '@duncit/buttons';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';
import StatCard, { ICON_DISC_SX } from './StatCard';

/** myHostEarningsSummary — lifetime/pending/this-month totals for the host. */
export interface HostEarningsSummary {
  currency_symbol: string;
  lifetime_earnings: number;
  pending_amount: number;
  pods_completed: number;
  this_month_earnings: number;
}

interface Props {
  balance: number;
  currency: string;
  nextPayoutAt?: string | null;
  summary?: HostEarningsSummary | null;
}

/** Host earnings summary — available wallet balance + next payout, with wallet
 * and withdraw shortcuts (B2-#5), plus the settled-earnings summary from
 * myHostEarningsSummary (Pod Finance Breakdown). */
export default function EarningsCard({ balance, currency, nextPayoutAt, summary }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const symbol = summary?.currency_symbol ?? currency;
  const money = (value: number) => `${symbol}${value.toFixed(2)}`;

  return (
    <Stack spacing={1.5}>
      <Card>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box sx={ICON_DISC_SX}>
              <PaymentsIcon fontSize="small" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="caption"
                sx={{ display: 'block', color: 'text.secondary', fontWeight: 600 }}
              >
                AVAILABLE BALANCE
              </Typography>
              <Typography noWrap sx={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.15 }}>
                {currency}
                {balance.toFixed(2)}
              </Typography>
            </Box>
            <DuncitButton
              component={RouterLink}
              to="/host/wallet"
              variant="outlined"
              size="small"
              startIcon={<AccountBalanceWalletIcon />}
              sx={{ flexShrink: 0, minHeight: 36 }}
            >
              Wallet
            </DuncitButton>
          </Stack>
          {nextPayoutAt ? (
            <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>
              Next payout {formatDate(nextPayoutAt)}
            </Typography>
          ) : null}
        </CardContent>
      </Card>
      {summary && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5 }}>
          <StatCard label={t('mweb.common.lifetimeEarnings')} value={money(summary.lifetime_earnings)} />
          <StatCard label={t('mweb.common.pendingApproval')} value={money(summary.pending_amount)} />
          <StatCard label={t('mweb.common.thisMonth')} value={money(summary.this_month_earnings)} />
          <StatCard label={t('mweb.common.podsCompleted')} value={String(summary.pods_completed)} />
        </Box>
      )}
    </Stack>
  );
}
