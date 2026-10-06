import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, DialogActions, MenuItem, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { CmsFragmentRow } from '../../queries/fragments';
import { useCmsLabels } from '../../lib/labels';
import { fragmentSchema, toFragmentFormValues, type FragmentFormOutput, type FragmentFormValues } from './fragment.types';

interface Props {
  fragment: CmsFragmentRow | null;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: FragmentFormOutput) => void;
  onCancel: () => void;
}

/** A fragment's name, key and kind — its design is done in the editor. */
export default function FragmentForm({ fragment, submitting, errorMessage, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useCmsLabels();
  const schema = useMemo(() => fragmentSchema((key) => t(key)), [t]);
  const { control, handleSubmit } = useForm<FragmentFormValues, unknown, FragmentFormOutput>({
    defaultValues: toFragmentFormValues(fragment),
    resolver: zodResolver(schema) as Resolver<FragmentFormValues, unknown, FragmentFormOutput>,
    mode: 'onTouched',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="cms-fragment-form">
      <Stack spacing={2} sx={{ mt: 1 }}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <RhfTextField control={control} name="name" label={t('websiteApp.cms.fragmentForm.name')} required />
        <RhfTextField control={control} name="key" label={t('websiteApp.cms.fragmentForm.key')} hint={t('websiteApp.cms.fragmentForm.keyHint')} required />
        <RhfTextField control={control} name="kind" select label={t('websiteApp.cms.fragmentForm.kind')}>
          {(['HEADER', 'FOOTER', 'SECTION'] as const).map((kind) => (
            <MenuItem key={kind} value={kind}>
              {labels.fragmentKind[kind]}
            </MenuItem>
          ))}
        </RhfTextField>
      </Stack>
      <DialogActions sx={{ px: 0, pt: 2 }}>
        <DuncitButton onClick={onCancel} disabled={submitting}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" loading={submitting}>
          {t('shell.common.save')}
        </DuncitButton>
      </DialogActions>
    </form>
  );
}
