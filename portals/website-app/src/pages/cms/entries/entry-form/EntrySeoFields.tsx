import { Controller, type Control } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { SingleImageUploadField } from '@duncit/media-picker';
import { useTranslation } from '@duncit/shell';
import RhfSwitch from '../../components/RhfSwitch';
import type { EntryFormValues } from './entry.types';

/** How the entry looks in search results and when shared. Empty falls back to
 * the title, summary and cover. */
export default function EntrySeoFields({ control }: Readonly<{ control: Control<EntryFormValues> }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
        {t('websiteApp.cms.entryForm.seo')}
      </Typography>
      <RhfTextField control={control} name="seo_title" label={t('websiteApp.cms.pageForm.seoTitle')} slotProps={{ htmlInput: { maxLength: 160 } }} />
      <RhfTextField
        control={control}
        name="seo_description"
        label={t('websiteApp.cms.pageForm.seoDescription')}
        multiline
        minRows={2}
        slotProps={{ htmlInput: { maxLength: 320 } }}
      />
      <Controller
        control={control}
        name="seo_image"
        render={({ field, fieldState }) => (
          <SingleImageUploadField
            value={field.value ?? ''}
            onChange={field.onChange}
            folder="/website/cms"
            label={t('websiteApp.cms.pageForm.seoImage')}
            error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
          />
        )}
      />
      <RhfSwitch control={control} name="noindex" label={t('websiteApp.cms.pageForm.noindex')} />
    </Stack>
  );
}
