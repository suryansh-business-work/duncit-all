import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { EMPLOYEE_TARGET_LIMITS as L } from '@duncit/utils';
import { EMPTY_REVIEW_VALUES, reviewTargetSchema } from './review-target.schema';
import type { ReviewTargetFormProps, ReviewTargetFormValues } from './review-target.types';

/** Mark a submitted report as reviewed, with an optional comment the employee sees. */
export default function ReviewTargetForm({ onSubmit }: Readonly<ReviewTargetFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => reviewTargetSchema(t), [t]);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ReviewTargetFormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_REVIEW_VALUES });

  const submit = async (values: ReviewTargetFormValues) => {
    if (await onSubmit(values)) reset(EMPTY_REVIEW_VALUES);
  };

  return (
    <Stack spacing={1.5} component="form" noValidate onSubmit={handleSubmit(submit)} data-testid="review-target-form">
      <RhfTextField
        control={control}
        name="comment"
        label={t('employeeTargets.review.comment')}
        hint={t('employeeTargets.review.commentHint')}
        multiline
        minRows={2}
        maxRows={6}
        slotProps={{ htmlInput: { maxLength: L.commentMax, 'data-testid': 'review-target-comment' } }}
      />
      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton
          type="submit"
          variant="contained"
          startIcon={<TaskAltIcon />}
          disabled={isSubmitting}
          data-testid="review-target-submit"
        >
          {t('employeeTargets.review.submit')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
