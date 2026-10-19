import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import { makeGigJobSchema } from '@duncit/forms/schemas';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import type { GigJobFormValues } from '@duncit/utils';
import GigContactFields from './GigContactFields';
import GigWhatFields from './GigWhatFields';
import GigWhenWhereFields from './GigWhenWhereFields';
import type { GigJobFormProps } from './gig-job.types';

/** Post or edit a gig: what is needed, when and where, and who to call. */
export default function GigJobForm({
  initialValues,
  categories,
  posterRoles,
  editing,
  busy,
  errorMessage,
  onSubmit,
  onCancel,
}: Readonly<GigJobFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeGigJobSchema(t), [t]);
  const { control, handleSubmit, getValues, setValue } = useForm<GigJobFormValues>({
    defaultValues: initialValues,
    // The schema's output is the same shape, trimmed — the form keeps its own value type.
    resolver: zodResolver(schema) as unknown as Resolver<GigJobFormValues>,
    mode: 'onBlur',
  });

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} data-testid="gig-job-form">
      <Stack spacing={2.5}>
        {errorMessage && (
          <Alert severity="error" data-testid="gig-form-error">
            {errorMessage}
          </Alert>
        )}
        <GigWhatFields
          control={control}
          categories={categories}
          posterRoles={posterRoles}
          getValues={getValues}
          setValue={setValue}
        />
        <GigWhenWhereFields control={control} />
        <GigContactFields control={control} />
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton onClick={onCancel} disabled={busy}>
            {t('gigJobs.form.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" loading={busy} disabled={busy} data-testid="gig-form-submit">
            {editing ? t('gigJobs.form.submitEdit') : t('gigJobs.form.submitCreate')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
