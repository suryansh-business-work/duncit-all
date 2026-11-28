import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box } from '@mui/material';
import { RhfSelect, RhfSwitch, RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { HR_EMPLOYEE_LIMITS as L, HR_EXIT_TYPES, HR_EXIT_TYPE_KEYS, hrOptions } from '@duncit/utils';
import DayField from '../../../fields/DayField';
import FormShell from '../FormShell';
import { exitSchema } from './exit.schema';
import type { ExitFormProps, ExitFormValues, ExitOutput } from './exit.types';

/**
 * Record an exit. A last working day before today ends the employment now and
 * removes the Employee console; otherwise notice is served until that day.
 */
export default function ExitForm({ dateOfJoining, suggestedLastDay, onSubmit, onCancel }: Readonly<ExitFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => exitSchema(t, dateOfJoining), [t, dateOfJoining]);
  const methods = useForm<ExitFormValues, unknown, ExitOutput>({
    resolver: zodResolver(schema),
    defaultValues: { exit_type: 'RESIGNATION', resignation_date: '', last_working_day: suggestedLastDay, reason: '', eligible_for_rehire: true },
  });
  return (
    <FormShell methods={methods} onSubmit={onSubmit} onCancel={onCancel} submitLabel={t('hrEmployee.profile.recordExit')} testId="hr-exit-form">
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
        <RhfSelect control={methods.control} name="exit_type" label={t('hrEmployee.field.exitType')} options={hrOptions(HR_EXIT_TYPES, HR_EXIT_TYPE_KEYS, t)} />
        <DayField name="resignation_date" label={t('hrEmployee.field.resignationDate')} testId="hr-exit-resignation" />
        <DayField name="last_working_day" label={t('hrEmployee.field.lastWorkingDay')} hint={t('hrEmployee.hint.lastWorkingDay')} required testId="hr-exit-last-day" />
      </Box>
      <RhfTextField control={methods.control} name="reason" label={t('hrEmployee.field.exitReason')} multiline minRows={2} slotProps={{ htmlInput: { maxLength: L.noteMax, 'data-testid': 'hr-exit-reason' } }} />
      <RhfSwitch control={methods.control} name="eligible_for_rehire" label={t('hrEmployee.field.eligibleForRehire')} />
    </FormShell>
  );
}
