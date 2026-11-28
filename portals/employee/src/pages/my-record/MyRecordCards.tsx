import { Alert, Box, Chip, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material';
import { formatDay } from '@duncit/app-settings';
import { InfoRow, SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { HR_EMPLOYMENT_TYPE_KEYS, HR_PAY_TYPE_KEYS, formatCurrency, type HrBankSummary, type HrCompensationRecord, type HrEmployeeRecord } from '@duncit/utils';

const grid = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } };

/** My code, title, department, manager, type and dates, as HR holds them. */
export function MyJobCard({ employee }: Readonly<{ employee: HrEmployeeRecord }>) {
  const { t } = useTranslation();
  const job = employee.job;
  const notSet = t('hrEmployee.profile.notSet');
  return (
    <SectionCard title={t('hrEmployee.self.jobTitle')}>
      <Box sx={grid}>
        <InfoRow label={t('hrEmployee.field.employeeCode')} value={employee.employee_code} />
        <InfoRow label={t('hrEmployee.field.jobTitle')} value={job.job_title} />
        <InfoRow label={t('hrEmployee.field.employmentType')} value={t(HR_EMPLOYMENT_TYPE_KEYS[job.employment_type])} />
        <InfoRow label={t('hrEmployee.field.department')} value={job.department ?? notSet} />
        <InfoRow label={t('hrEmployee.field.workLocation')} value={job.work_location ?? notSet} />
        <InfoRow label={t('hrEmployee.field.manager')} value={job.manager?.name ?? notSet} />
        <InfoRow label={t('hrEmployee.field.dateOfJoining')} value={formatDay(job.date_of_joining)} />
        <InfoRow label={t('hrEmployee.field.probationEnd')} value={job.probation_end_date ? formatDay(job.probation_end_date) : notSet} />
        <InfoRow label={t('hrEmployee.field.noticeDays')} value={String(job.notice_period_days)} />
      </Box>
    </SectionCard>
  );
}

/** The pay in force today: its lines and what they add up to. */
export function MyPayCard({ pay }: Readonly<{ pay: HrCompensationRecord | null }>) {
  const { t } = useTranslation();
  if (!pay) {
    return (
      <SectionCard title={t('hrEmployee.self.payTitle')}>
        <Typography variant="body2">{t('hrEmployee.self.payNone')}</Typography>
      </SectionCard>
    );
  }
  const money = (value: number) => formatCurrency(value, pay.currency, 2);
  return (
    <SectionCard title={t('hrEmployee.self.payTitle')} subtitle={t('hrEmployee.pay.effective', { vars: { date: formatDay(pay.effective_from) } })}>
      <Box sx={{ ...grid, mb: 2 }}>
        <InfoRow label={t('hrEmployee.pay.gross')} value={money(pay.totals.gross_monthly)} />
        <InfoRow label={t('hrEmployee.pay.deductions')} value={money(pay.totals.deductions_monthly)} />
        <InfoRow label={t('hrEmployee.pay.net')} value={money(pay.totals.net_monthly)} />
        <InfoRow label={t('hrEmployee.pay.variable')} value={money(pay.totals.variable_monthly)} />
        <InfoRow label={t('hrEmployee.pay.annualCtc')} value={money(pay.totals.annual_ctc)} />
      </Box>
      <Table size="small" aria-label={t('hrEmployee.self.payTitle')}>
        <TableBody>
          {pay.components.map((line, index) => (
            <TableRow key={`${line.label}-${index}`}>
              <TableCell>
                {line.label}
                {line.target_linked && <Chip size="small" color="info" label={t('hrEmployee.pay.targetChip')} sx={{ ml: 1 }} />}
              </TableCell>
              <TableCell>{t(HR_PAY_TYPE_KEYS[line.type])}</TableCell>
              <TableCell align="right">{money(line.monthly_amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SectionCard>
  );
}

/** Bank details, masked; changed only through HR. */
export function MyBankCard({ bank }: Readonly<{ bank: HrBankSummary }>) {
  const { t } = useTranslation();
  const notSet = t('hrEmployee.profile.notSet');
  return (
    <SectionCard title={t('hrEmployee.self.bankTitle')}>
      <Alert severity="info" sx={{ mb: 2 }}>{t('hrEmployee.self.bankHint')}</Alert>
      <Box sx={grid}>
        <InfoRow label={t('hrEmployee.field.accountHolder')} value={bank.account_holder_name ?? notSet} />
        <InfoRow label={t('hrEmployee.field.accountNumber')} value={bank.account_number_masked ?? notSet} />
        <InfoRow label={t('hrEmployee.field.ifsc')} value={bank.ifsc ?? notSet} />
        <InfoRow label={t('hrEmployee.field.pan')} value={bank.pan_masked ?? notSet} />
        <InfoRow label={t('hrEmployee.field.uan')} value={bank.uan ?? notSet} />
      </Box>
    </SectionCard>
  );
}
