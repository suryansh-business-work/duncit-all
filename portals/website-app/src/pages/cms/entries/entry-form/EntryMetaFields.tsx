import { Controller, type Control } from 'react-hook-form';
import { Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { SingleImageUploadField } from '@duncit/media-picker';
import { useTranslation } from '@duncit/shell';
import DateTimeField from '../../../../components/DateTimeField';
import RhfSwitch from '../../components/RhfSwitch';
import type { EntryFormValues } from './entry.types';

/** Publishing and listing details: cover, category, tags, author, date, status. */
export default function EntryMetaFields({ control }: Readonly<{ control: Control<EntryFormValues> }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      <RhfSwitch control={control} name="is_published" label={t('websiteApp.cms.entryForm.published')} />
      <Controller
        control={control}
        name="published_at"
        render={({ field }) => (
          <DateTimeField
            label={t('websiteApp.cms.entryForm.publishedAt')}
            helperText={t('websiteApp.cms.entryForm.publishedAtHint')}
            value={field.value ?? ''}
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="cover_image_url"
        render={({ field, fieldState }) => (
          <SingleImageUploadField
            value={field.value ?? ''}
            onChange={field.onChange}
            folder="/website/cms"
            label={t('websiteApp.cms.entryForm.cover')}
            error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
          />
        )}
      />
      <RhfTextField control={control} name="category" label={t('websiteApp.cms.entryForm.category')} />
      <RhfTextField control={control} name="tags" label={t('websiteApp.cms.entryForm.tags')} hint={t('websiteApp.cms.entryForm.tagsHint')} />
      <RhfTextField control={control} name="author_name" label={t('websiteApp.cms.entryForm.author')} />
      <RhfTextField control={control} name="sort_order" type="number" label={t('websiteApp.cms.pageForm.sortOrder')} />
    </Stack>
  );
}
