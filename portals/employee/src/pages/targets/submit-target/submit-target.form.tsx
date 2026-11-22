import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import { EMPLOYEE_TARGET_LIMITS as L } from '@duncit/utils';
import { submitTargetSchema, valuesFromTarget } from './submit-target.schema';
import type { SubmitTargetFormProps, SubmitTargetFormValues } from './submit-target.types';
import CompletionField from './CompletionField';
import AchievementRows from './AchievementRows';

/**
 * The month's progress report: completion, achievements and updates. A month
 * already reported on opens with that report, to correct it until reviewed.
 */
export default function SubmitTargetForm({ target, onSubmit }: Readonly<SubmitTargetFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => submitTargetSchema(t), [t]);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<SubmitTargetFormValues>({ resolver: zodResolver(schema), defaultValues: valuesFromTarget(target) });

  useEffect(() => {
    reset(valuesFromTarget(target));
  }, [target, reset]);

  return (
    <Stack spacing={2.5} component="form" noValidate onSubmit={handleSubmit(onSubmit)} data-testid="submit-target-form">
      <CompletionField control={control} />
      <AchievementRows control={control} />
      <RhfTextField
        control={control}
        name="updates"
        label={t('employeeTargets.submitForm.updates')}
        hint={t('employeeTargets.submitForm.updatesHint')}
        multiline
        minRows={3}
        maxRows={10}
        slotProps={{ htmlInput: { maxLength: L.updatesMax, 'data-testid': 'submit-target-updates' } }}
      />
      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton type="submit" variant="contained" startIcon={<SendIcon />} disabled={isSubmitting} data-testid="submit-target-submit">
          {target.submission ? t('employeeTargets.submitForm.resubmit') : t('employeeTargets.submitForm.submit')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
