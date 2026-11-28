import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { HR_EMPLOYEE_LIMITS as L } from '@duncit/utils';
import JobFields from '../../../fields/JobFields';
import { jobValuesFrom } from '../../../fields/employee-fields.defaults';
import FormShell from '../FormShell';
import { rehireSchema } from './rehire.schema';
import type { RehireFormProps, RehireFormValues, RehireOutput } from './rehire.types';

/** Bring a former employee back on the same record: a new joining date and job, and the Employee console again. */
export default function RehireForm({ employeeId, job, lastWorkingDay, settings, onSubmit, onCancel }: Readonly<RehireFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => rehireSchema(t, lastWorkingDay), [t, lastWorkingDay]);
  const methods = useForm<RehireFormValues, unknown, RehireOutput>({
    resolver: zodResolver(schema),
    defaultValues: { job: { ...jobValuesFrom(job), date_of_joining: '', probation_end_date: '' }, note: '' },
  });
  return (
    <FormShell methods={methods} onSubmit={onSubmit} onCancel={onCancel} submitLabel={t('hrEmployee.profile.rehire')} testId="hr-rehire-form">
      <JobFields prefix="job." settings={settings} employeeId={employeeId} suggestProbation />
      <RhfTextField control={methods.control} name="note" label={t('hrEmployee.field.note')} multiline minRows={2} slotProps={{ htmlInput: { maxLength: L.noteMax, 'data-testid': 'hr-rehire-note' } }} />
    </FormShell>
  );
}
