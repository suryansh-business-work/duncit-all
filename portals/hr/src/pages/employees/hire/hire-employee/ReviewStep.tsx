import { useFormContext, useWatch } from 'react-hook-form';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { formatDay } from '@duncit/app-settings';
import { InfoRow } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { HR_EMPLOYMENT_TYPE_KEYS, hrPayTotals } from '@duncit/utils';
import PayTotals from '../../fields/PayTotals';
import type { HireFormValues } from './hire-employee.types';

const grid = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } };

/** Everything the hire will write, read back before HR presses Hire. */
export default function ReviewStep({ nextCode }: Readonly<{ nextCode: string }>) {
  const { t } = useTranslation();
  const { control } = useFormContext<HireFormValues>();
  const values = useWatch({ control }) as HireFormValues;
  const notSet = t('hrEmployee.profile.notSet');
  const account =
    values.account_mode === 'NEW'
      ? t('hrEmployee.hire.reviewAccountNew', { vars: { email: values.new_email } })
      : t('hrEmployee.hire.reviewAccountExisting', { vars: { name: values.account?.name ?? notSet } });
  const day = (value: string) => (value ? formatDay(value) : notSet);
  const totals = hrPayTotals(values.pay.lines.map((line) => ({ ...line, monthly_amount: Number(line.monthly_amount) || 0 })));

  return (
    <Stack spacing={2} data-testid="hr-hire-review">
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('hrEmployee.hire.reviewIntro')}
      </Typography>
      <Box sx={grid}>
        <InfoRow label={t('hrEmployee.hire.step.account')} value={account} />
        <InfoRow label={t('hrEmployee.field.employeeCode')} value={values.employee_code.toUpperCase() || nextCode} />
        <InfoRow label={t('hrEmployee.field.firstName')} value={`${values.personal.first_name} ${values.personal.last_name}`.trim() || notSet} />
        <InfoRow label={t('hrEmployee.field.jobTitle')} value={values.job.job_title || notSet} />
        <InfoRow label={t('hrEmployee.field.department')} value={values.job.department || notSet} />
        <InfoRow label={t('hrEmployee.field.manager')} value={values.job.manager?.name ?? notSet} />
        <InfoRow label={t('hrEmployee.field.employmentType')} value={t(HR_EMPLOYMENT_TYPE_KEYS[values.job.employment_type])} />
        <InfoRow label={t('hrEmployee.field.dateOfJoining')} value={day(values.job.date_of_joining)} />
        <InfoRow label={t('hrEmployee.field.probationEnd')} value={day(values.job.probation_end_date)} />
      </Box>
      <Divider />
      <Typography variant="subtitle2" component="h3">{t('hrEmployee.field.compensation')}</Typography>
      {values.include_pay ? <PayTotals totals={totals} currency={values.pay.currency || 'INR'} /> : <Typography variant="body2">{t('hrEmployee.hire.reviewNoPay')}</Typography>}
      <Divider />
      <Typography variant="subtitle2" component="h3">{t('hrEmployee.hire.step.bank')}</Typography>
      <Typography variant="body2">
        {values.bank.ifsc || values.bank.account_number ? [values.bank.account_holder_name, values.bank.bank_name, values.bank.ifsc.toUpperCase()].filter(Boolean).join(' · ') : t('hrEmployee.hire.reviewNoBank')}
      </Typography>
    </Stack>
  );
}
