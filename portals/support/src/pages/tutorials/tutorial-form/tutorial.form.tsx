import { useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, MenuItem, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import FormDialogActions from '../../../components/FormDialogActions';
import TutorialThumbnailField from './TutorialThumbnailField';
import TutorialVideoField from './TutorialVideoField';
import {
  TUTORIAL_DESCRIPTION_MAX,
  TUTORIAL_TITLE_MAX,
  tutorialSchema,
  type TutorialFormOutput,
  type TutorialFormValues,
  type TutorialOption,
} from './tutorial.types';

interface Props {
  initialValues: TutorialFormValues;
  topicOptions: TutorialOption[];
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: TutorialFormOutput) => void;
  onCancel: () => void;
}

/** The video, its thumbnail, copy, topic, language, status and order for one tutorial. */
export default function TutorialForm({
  initialValues,
  topicOptions,
  submitting,
  errorMessage,
  onSubmit,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => tutorialSchema(t), [t]);
  const { control, handleSubmit, setValue, watch } = useForm<TutorialFormValues, unknown, TutorialFormOutput>({
    defaultValues: initialValues,
    resolver: zodResolver(schema) as Resolver<TutorialFormValues, unknown, TutorialFormOutput>,
    mode: 'onTouched',
  });
  const durationSec = watch('duration_sec');

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="tutorial-form">
      <Stack spacing={2} sx={{ mt: 1 }}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        {topicOptions.length === 0 && <Alert severity="warning">{t('support.tutorials.noTopicsYet')}</Alert>}
        <Controller
          control={control}
          name="video_url"
          render={({ field, fieldState }) => (
            <TutorialVideoField
              value={field.value}
              durationSec={durationSec}
              error={fieldState.error?.message}
              onUploaded={field.onChange}
              onDuration={(seconds) => setValue('duration_sec', seconds)}
            />
          )}
        />
        <Controller
          control={control}
          name="thumbnail_url"
          render={({ field }) => (
            <TutorialThumbnailField value={field.value} onChange={field.onChange} />
          )}
        />
        <RhfTextField
          control={control}
          name="title"
          label={t('support.tutorials.fieldTitle')}
          required
          slotProps={{ htmlInput: { maxLength: TUTORIAL_TITLE_MAX } }}
        />
        <RhfTextField
          control={control}
          name="description"
          label={t('support.tutorials.fieldDescription')}
          multiline
          minRows={3}
          slotProps={{ htmlInput: { maxLength: TUTORIAL_DESCRIPTION_MAX } }}
        />
        <RhfTextField control={control} name="topic" select required label={t('support.tutorials.fieldTopic')}>
          {topicOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </RhfTextField>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <RhfTextField control={control} name="language" select label={t('support.tutorials.fieldLanguage')}>
            <MenuItem value="en">{t('support.tutorials.languageEnglish')}</MenuItem>
            <MenuItem value="hi">{t('support.tutorials.languageHindi')}</MenuItem>
          </RhfTextField>
          <RhfTextField control={control} name="status" select label={t('support.tutorials.fieldStatus')}>
            <MenuItem value="DRAFT">{t('support.tutorials.statusDraft')}</MenuItem>
            <MenuItem value="PUBLISHED">{t('support.tutorials.statusPublished')}</MenuItem>
          </RhfTextField>
          <RhfTextField
            control={control}
            name="sort_order"
            type="number"
            label={t('support.tutorials.fieldOrder')}
            hint={t('support.tutorials.fieldOrderHint')}
          />
        </Stack>
      </Stack>
      <FormDialogActions submitting={submitting} onCancel={onCancel} saveTestId="tutorial-form-save" />
    </form>
  );
}
