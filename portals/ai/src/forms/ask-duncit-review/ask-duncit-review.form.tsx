import { useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Checkbox, FormControlLabel, MenuItem, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { askDuncitReviewDefaults, buildAskDuncitReviewSchema, type AskDuncitReviewFormProps, type AskDuncitReviewValues } from './ask-duncit-review.types';

type ReviewResolver = Resolver<AskDuncitReviewValues, unknown, AskDuncitReviewValues>;

/** Accept or dismiss a rated answer, optionally drafting a knowledge article (RHF + Zod). */
export default function AskDuncitReviewForm({ formId, onSubmit }: Readonly<AskDuncitReviewFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildAskDuncitReviewSchema(t), [t]);
  const { control, handleSubmit, watch } = useForm<AskDuncitReviewValues, unknown, AskDuncitReviewValues>({
    defaultValues: askDuncitReviewDefaults,
    resolver: zodResolver(schema) as unknown as ReviewResolver,
    mode: 'onTouched',
  });
  const accepted = watch('status') === 'ACCEPTED';

  return (
    <Stack component="form" id={formId} noValidate spacing={2} onSubmit={handleSubmit(onSubmit)} data-testid="ask-duncit-review-form" sx={{ pt: 1 }}>
      <RhfTextField control={control} name="status" select label={t('ai.askDuncit.feedback.decision')} fullWidth>
        <MenuItem value="ACCEPTED">{t('ai.askDuncit.feedback.accept')}</MenuItem>
        <MenuItem value="DISMISSED">{t('ai.askDuncit.feedback.dismiss')}</MenuItem>
      </RhfTextField>
      <RhfTextField control={control} name="note" label={t('ai.askDuncit.feedback.note')} hint={t('ai.askDuncit.feedback.noteHint')} multiline minRows={4} fullWidth />
      {accepted && (
        <Controller
          control={control}
          name="add_to_knowledge"
          render={({ field }) => (
            <FormControlLabel control={<Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />} label={t('ai.askDuncit.feedback.addToKnowledge')} />
          )}
        />
      )}
    </Stack>
  );
}
