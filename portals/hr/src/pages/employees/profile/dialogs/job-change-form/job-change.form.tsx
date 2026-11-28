import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box } from '@mui/material';
import { RhfSelect, RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { HR_EMPLOYEE_LIMITS as L, HR_JOB_CHANGE_REASONS, HR_JOB_CHANGE_REASON_KEYS, dayKeyOf, hrOptions } from '@duncit/utils';
import JobFields from '../../../fields/JobFields';
import DayField from '../../../fields/DayField';
import { jobValuesFrom } from '../../../fields/employee-fields.defaults';
import FormShell from '../FormShell';
import { jobChangeSchema } from './job-change.schema';
import type { JobChangeFormProps, JobChangeFormValues, JobChangeOutput } from './job-change.types';

/** Record a promotion, transfer, role or manager change. The history keeps the old and new values. */
export default function JobChangeForm({ employeeId, job, settings, onSubmit, onCancel }: Readonly<JobChangeFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => jobChangeSchema(t), [t]);
  const methods = useForm<JobChangeFormValues, unknown, JobChangeOutput>({
    resolver: zodResolver(schema),
    defaultValues: { job: jobValuesFrom(job), reason: 'PROMOTION', effective_date: dayKeyOf(new Date()), note: '' },
  });
  return (
    <FormShell methods={methods} onSubmit={onSubmit} onCancel={onCancel} submitLabel={t('shell.common.save')} testId="hr-job-form">
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <RhfSelect control={methods.control} name="reason" label={t('hrEmployee.field.jobReason')} options={hrOptions(HR_JOB_CHANGE_REASONS, HR_JOB_CHANGE_REASON_KEYS, t)} />
        <DayField name="effective_date" label={t('hrEmployee.field.effectiveDate')} hint={t('hrEmployee.hint.effectiveDate')} required maxDate={new Date()} testId="hr-job-effective" />
      </Box>
      <JobFields prefix="job." settings={settings} employeeId={employeeId} />
      <RhfTextField control={methods.control} name="note" label={t('hrEmployee.field.note')} multiline minRows={2} slotProps={{ htmlInput: { maxLength: L.noteMax, 'data-testid': 'hr-job-note' } }} />
    </FormShell>
  );
}
