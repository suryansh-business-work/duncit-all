import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, DialogActions, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { duplicateSchema, type DuplicateFormOutput, type DuplicateFormValues } from './duplicate.types';

interface Props {
  defaultValues: DuplicateFormValues;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: DuplicateFormOutput) => void;
  onCancel: () => void;
}

/** The new title and address for a copy of a page. */
export default function DuplicateForm({ defaultValues, submitting, errorMessage, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => duplicateSchema((key) => t(key)), [t]);
  const { control, handleSubmit } = useForm<DuplicateFormValues, unknown, DuplicateFormOutput>({
    defaultValues,
    resolver: zodResolver(schema) as Resolver<DuplicateFormValues, unknown, DuplicateFormOutput>,
    mode: 'onTouched',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="cms-duplicate-form">
      <Stack spacing={2} sx={{ mt: 1 }}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <RhfTextField control={control} name="title" label={t('websiteApp.cms.pageForm.title')} required />
        <RhfTextField control={control} name="path" label={t('websiteApp.cms.pageForm.path')} hint={t('websiteApp.cms.pageForm.pathHint')} required />
      </Stack>
      <DialogActions sx={{ px: 0, pt: 2 }}>
        <DuncitButton onClick={onCancel} disabled={submitting}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" loading={submitting}>
          {t('websiteApp.cms.pages.duplicate')}
        </DuncitButton>
      </DialogActions>
    </form>
  );
}
