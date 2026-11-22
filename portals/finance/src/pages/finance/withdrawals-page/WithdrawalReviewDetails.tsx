import type { ReactNode } from 'react';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import { formatMoney } from '@duncit/utils';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import { payoutTarget } from './account-details';
import type { WithdrawalReviewData } from './queries';
import { translatedRoleLabel } from './roles';

type Review = WithdrawalReviewData['withdrawalReview'];

const money = (amount: number) => formatMoney(amount, { decimals: 2 });

function Detail({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2" component="div" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
        {children}
      </Typography>
    </Box>
  );
}

/**
 * What Finance checks before deciding: who is asking, how much, where the money
 * would go, and whether Duncit has verified that account.
 *
 * The FULL account number is shown here, in the one dialog opened deliberately
 * for one row. The list stays masked — a shared screen with a column of account
 * numbers is the thing worth avoiding — but nobody can approve a payment to an
 * account they are not allowed to read.
 */
export default function WithdrawalReviewDetails({ review }: Readonly<{ review: Review }>) {
  const { t } = useTranslation();
  const w = review.withdrawal;
  return (
    <Stack spacing={2}>
      {review.payouts_configured ? null : <Alert severity="warning">{t('finance.payouts.notConfigured')}</Alert>}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        <Detail label={t('finance.withdrawals.withdrawerName')}>
          {w.beneficiary_name}
          <Typography variant="caption" component="div" sx={{ color: 'text.secondary', fontWeight: 400 }}>
            {w.beneficiary_email}
          </Typography>
        </Detail>
        <Detail label={t('finance.withdrawals.role')}>{translatedRoleLabel(t, w.withdrawer_role)}</Detail>
        <Detail label={t('finance.payouts.requestedAmount')}>{money(w.requested_amount)}</Detail>
        <Detail label={t('finance.payouts.walletBalance')}>{money(review.wallet_balance)}</Detail>
        <Detail label={t('finance.withdrawals.withdrawalMethod')}>{w.payout_method}</Detail>
        <Detail label={t('finance.payouts.requestedOn')}>{formatDateTime(w.requested_at)}</Detail>
      </Box>
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
        <Stack
          direction="row"
          useFlexGap
          sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 0.5 }}
        >
          <Typography variant="subtitle2">{t('finance.payouts.payTo')}</Typography>
          {review.account_verified ? (
            <Chip size="small" color="success" label={t('finance.payouts.verifiedAccount')} />
          ) : (
            <Chip size="small" color="warning" label={t('finance.payouts.unverifiedAccount')} />
          )}
        </Stack>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>
          {payoutTarget(w)}
        </Typography>
        {review.verified_account ? (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {review.verified_account.label}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}
