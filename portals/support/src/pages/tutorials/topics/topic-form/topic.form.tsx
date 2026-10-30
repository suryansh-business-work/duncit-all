import { useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, DialogActions, FormControlLabel, Stack, Switch } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { TOPIC_FIELD_MAX, topicSchema, type TopicFormOutput, type TopicFormValues } from './topic.types';

interface Props {
  initialValues: TopicFormValues;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: TopicFormOutput) => void;
  onCancel: () => void;
}

/** A tutorial topic's name, key, order and whether members see it. */
export default function TopicForm({ initialValues, submitting, errorMessage, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => topicSchema(t), [t]);
  const { control, handleSubmit } = useForm<TopicFormValues, unknown, TopicFormOutput>({
    defaultValues: initialValues,
    resolver: zodResolver(schema) as Resolver<TopicFormValues, unknown, TopicFormOutput>,
    mode: 'onTouched',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="tutorial-topic-form">
      <Stack spacing={2} sx={{ mt: 1 }}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <RhfTextField
          control={control}
          name="label"
          required
          label={t('support.tutorialTopics.fieldLabel')}
          slotProps={{ htmlInput: { maxLength: TOPIC_FIELD_MAX } }}
        />
        <RhfTextField
          control={control}
          name="key"
          required
          label={t('support.tutorialTopics.fieldKey')}
          hint={t('support.tutorialTopics.fieldKeyHint')}
          slotProps={{ htmlInput: { maxLength: TOPIC_FIELD_MAX } }}
        />
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <RhfTextField
            control={control}
            name="sort_order"
            type="number"
            label={t('support.tutorialTopics.fieldOrder')}
            sx={{ maxWidth: 160 }}
          />
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />}
                label={t('support.tutorialTopics.fieldActive')}
              />
            )}
          />
        </Stack>
      </Stack>
      <DialogActions sx={{ px: 0, pt: 3 }}>
        <DuncitButton onClick={onCancel} disabled={submitting}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" disabled={submitting}>
          {submitting ? t('shell.common.saving') : t('shell.common.save')}
        </DuncitButton>
      </DialogActions>
    </form>
  );
}
