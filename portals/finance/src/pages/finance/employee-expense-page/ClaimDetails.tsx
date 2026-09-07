import { Alert, Box, Link, Stack } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { InfoRow, StatusChip } from '@duncit/ui';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import {
  EMPLOYEE_EXPENSE_STATUS_COLORS,
  EMPLOYEE_EXPENSE_STATUS_KEYS,
  formatMoney,
  type EmployeeExpenseClaim,
} from '@duncit/utils';
import { labelize } from './queries';

const GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: 2,
} as const;

/**
 * Everything Finance needs before deciding, laid out read-only.
 *
 * The missing-bill warning sits at the TOP rather than beside the bill row: an
 * approval with no receipt behind it is the one thing on this screen that
 * cannot be undone later, so it has to be read before the buttons are.
 */
export default function ClaimDetails({
  claim,
  currency,
}: Readonly<{ claim: EmployeeExpenseClaim; currency: string }>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const money = formatMoney(claim.amount, { symbol: currency, decimals: 2, grouping: false });

  return (
    <Stack spacing={2}>
      {!claim.bill_url && <Alert severity="warning">{t('employeeExpense.review.noBillWarning')}</Alert>}

      <Box sx={GRID_SX}>
        <InfoRow label={t('employeeExpense.col.employee')} value={claim.employee_name || claim.employee_email} />
        <InfoRow label={t('employeeExpense.col.claim')} value={claim.claim_id} />
        <InfoRow label={t('employeeExpense.col.date')} value={formatDate(claim.date)} />
        <InfoRow label={t('employeeExpense.col.amount')} value={money} valueWeight={700} />
        <InfoRow label={t('employeeExpense.col.category')} value={labelize(claim.category)} />
        <InfoRow
          label={t('employeeExpense.form.paymentMethod')}
          value={labelize(claim.payment_method)}
        />
        <InfoRow label={t('employeeExpense.col.merchant')} value={claim.merchant || '—'} />
        <InfoRow label={t('employeeExpense.form.reference')} value={claim.reference || '—'} />
        <InfoRow
          label={t('employeeExpense.col.status')}
          value={
            <StatusChip
              status={claim.status}
              colorMap={EMPLOYEE_EXPENSE_STATUS_COLORS}
              label={t(EMPLOYEE_EXPENSE_STATUS_KEYS[claim.status])}
            />
          }
        />
        <InfoRow
          label={t('employeeExpense.col.bill')}
          value={
            claim.bill_url ? (
              <Link
                href={claim.bill_url}
                target="_blank"
                rel="noreferrer"
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
              >
                <ReceiptLongIcon fontSize="inherit" />
                {claim.bill_number || t('employeeExpense.bill.view')}
              </Link>
            ) : (
              t('employeeExpense.bill.missing')
            )
          }
        />
      </Box>

      <InfoRow
        label={t('employeeExpense.form.description')}
        value={claim.description || '—'}
      />

      {claim.status !== 'PENDING' && (
        <InfoRow
          label={t('employeeExpense.review.decidedBy', {
            vars: { when: formatDate(claim.reviewed_at ?? '') },
          })}
          value={claim.review_note || '—'}
        />
      )}
    </Stack>
  );
}
