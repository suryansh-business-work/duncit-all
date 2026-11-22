import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { EMPLOYEE_TARGET_LIMITS as L } from '@duncit/utils';
import { EMPTY_ASSIGN_VALUES, assignTargetSchema, valuesFromTarget } from './assign-target.schema';
import type { AssignTargetFormProps, AssignTargetFormValues, AssignTargetOutput } from './assign-target.types';
import EmployeePickerField from './EmployeePickerField';
import MonthPickerField from './MonthPickerField';
import GoalRows from './GoalRows';

/**
 * Assign an employee their goals for a month, or edit the goals of one that
 * has not been reported on yet. Who and which month are fixed once a target
 * exists — a different month is a different target.
 */
export default function AssignTargetForm({ editing, onSubmit, onCancel }: Readonly<AssignTargetFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => assignTargetSchema(t), [t]);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<AssignTargetFormValues, unknown, AssignTargetOutput>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_ASSIGN_VALUES,
  });

  useEffect(() => {
    reset(editing ? valuesFromTarget(editing) : EMPTY_ASSIGN_VALUES);
  }, [editing, reset]);

  const submit = async (values: AssignTargetOutput) => {
    if (await onSubmit(values)) reset(EMPTY_ASSIGN_VALUES);
  };

  return (
    <Stack spacing={2} component="form" noValidate onSubmit={handleSubmit(submit)} data-testid="assign-target-form">
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
        <EmployeePickerField control={control} disabled={editing !== null} />
        <MonthPickerField control={control} disabled={editing !== null} />
      </Box>
      <GoalRows control={control} />
      <RhfTextField
        control={control}
        name="notes"
        label={t('employeeTargets.form.notes')}
        hint={t('employeeTargets.form.notesHint')}
        multiline
        minRows={2}
        maxRows={6}
        slotProps={{ htmlInput: { maxLength: L.notesMax, 'data-testid': 'assign-target-notes' } }}
      />
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton onClick={onCancel} disabled={isSubmitting} data-testid="assign-target-cancel">
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton
          type="submit"
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={isSubmitting}
          data-testid="assign-target-submit"
        >
          {editing ? t('employeeTargets.form.saveGoals') : t('employeeTargets.form.assign')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
