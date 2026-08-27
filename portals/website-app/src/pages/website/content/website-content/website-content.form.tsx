import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, DialogActions, FormControlLabel, Stack, Switch } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { SingleImageUploadField } from '@duncit/media-picker';
import DateTimeField from '../../../../components/DateTimeField';
import type { WebsiteContentItem, WebsitePageType } from '../queries';
import {
  blankValues,
  toContentInput,
  toFormValues,
  websiteContentSchema,
  type WebsiteContentFormValues,
  type WebsiteContentInput,
} from './website-content.types';
import { useTranslation } from '@duncit/shell';

interface Props {
  type: WebsitePageType;
  item: WebsiteContentItem | null;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (input: WebsiteContentInput) => void;
  onCancel: () => void;
}

export default function WebsiteContentForm({ type, item, submitting, errorMessage, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<WebsiteContentFormValues>({
    defaultValues: item ? toFormValues(item) : blankValues(),
    resolver: zodResolver(websiteContentSchema),
    mode: 'onTouched',
  });

  const submit = handleSubmit((values) => onSubmit(toContentInput(values, type)));

  return (
    <form onSubmit={submit} noValidate>
      <Stack spacing={2} sx={{ mt: 1 }}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <RhfTextField control={control} name="title" label={t('websiteApp.form.title')} required />
          <RhfTextField
            control={control}
            name="sort_order"
            label={t('websiteApp.form.sortOrder')}
            type="number"
            sx={{ maxWidth: { sm: 160 } }}
          />
        </Stack>
        <RhfTextField
          control={control}
          name="slug"
          label={t('websiteApp.form.slug')}
          hint="Leave blank to generate from the title."
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <RhfTextField control={control} name="category" label={t('websiteApp.form.category')} />
          <Controller
            control={control}
            name="published_at"
            render={({ field }) => (
              <DateTimeField label={t('websiteApp.form.publishedAt')} value={field.value ?? ''} onChange={field.onChange} />
            )}
          />
        </Stack>
        <RhfTextField control={control} name="summary" label={t('websiteApp.form.summary')} multiline minRows={2} />
        <RhfTextField control={control} name="body" label={t('websiteApp.form.body')} multiline minRows={5} />
        <Controller
          control={control}
          name="image_url"
          render={({ field, fieldState }) => (
            <SingleImageUploadField
              variant="url-adornment"
              label={t('websiteApp.form.image')}
              value={field.value ?? ''}
              onChange={field.onChange}
              folder="/website"
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <RhfTextField control={control} name="cta_label" label={t('websiteApp.form.ctaLabel')} />
          <RhfTextField control={control} name="cta_url" label={t('websiteApp.form.ctaUrl')} />
        </Stack>
        <Controller
          control={control}
          name="is_published"
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
              label={t('websiteApp.form.published')}
            />
          )}
        />
      </Stack>
      <DialogActions sx={{ px: 0, pt: 2 }}>
        <DuncitButton onClick={onCancel} disabled={submitting}>
          Cancel
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </DuncitButton>
      </DialogActions>
    </form>
  );
}
