import { useId, useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, FormLabel, Paper, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { DuncitRichTextInput } from '@duncit/rich-text';
import { useTranslation } from '@duncit/shell';
import type { CmsEntryData } from '../../queries/entries';
import EntryMetaFields from './EntryMetaFields';
import EntryCustomFields from './EntryCustomFields';
import EntrySeoFields from './EntrySeoFields';
import { entrySchema, toEntryFormValues, type EntryFormOutput, type EntryFormValues } from './entry.types';

interface Props {
  entry: CmsEntryData['cmsEntry'];
  /** What the AI rewrite is improving, e.g. "Duncit blog post". */
  aiContext: string;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: EntryFormOutput) => void;
}

export const ENTRY_MEDIA_FOLDER = '/website/cms';

/** A blog post, job opening, newsletter issue, case study or press item. */
export default function EntryForm({ entry, aiContext, submitting, errorMessage, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const bodyLabelId = useId();
  const schema = useMemo(() => entrySchema((key) => t(key)), [t]);
  const { control, handleSubmit } = useForm<EntryFormValues, unknown, EntryFormOutput>({
    defaultValues: toEntryFormValues(entry),
    resolver: zodResolver(schema) as Resolver<EntryFormValues, unknown, EntryFormOutput>,
    mode: 'onTouched',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="cms-entry-form">
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 340px' } }}>
        <Stack spacing={2}>
          <RhfTextField control={control} name="title" label={t('websiteApp.cms.entryForm.title')} required />
          <RhfTextField control={control} name="slug" label={t('websiteApp.cms.entryForm.slug')} hint={t('websiteApp.cms.entryForm.slugHint')} />
          <RhfTextField control={control} name="summary" label={t('websiteApp.cms.entryForm.summary')} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 600 } }} />
          <Controller
            control={control}
            name="body_html"
            render={({ field }) => (
              <Stack spacing={0.75} role="group" aria-labelledby={bodyLabelId}>
                <FormLabel id={bodyLabelId}>{t('websiteApp.cms.entryForm.body')}</FormLabel>
                <DuncitRichTextInput
                  value={field.value ?? ''}
                  onChange={(html) => field.onChange(html)}
                  ariaLabel={t('websiteApp.cms.entryForm.body')}
                  aiContext={aiContext}
                  imageFolder={ENTRY_MEDIA_FOLDER}
                  minHeight={320}
                />
              </Stack>
            )}
          />
          <EntryCustomFields control={control} />
        </Stack>
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <EntryMetaFields control={control} />
          </Paper>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <EntrySeoFields control={control} />
          </Paper>
          <DuncitButton type="submit" variant="contained" loading={submitting} data-testid="cms-entry-save">
            {t('shell.common.save')}
          </DuncitButton>
        </Stack>
      </Box>
    </form>
  );
}
