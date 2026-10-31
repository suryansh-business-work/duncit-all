import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DialogActions, MenuItem, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import { PIPELINES, PIPELINE_LABEL, SOURCES, SOURCE_LABEL, STAGES, STAGE_LABEL } from '../copy';
import { blankNewLeadValues, newLeadSchema, type NewLeadFormProps, type NewLeadFormValues } from './new-lead.types';

/** A lead typed in by hand: who, which pipeline, how to reach them. */
export default function NewLeadForm({ busy, onSubmit, onCancel }: Readonly<NewLeadFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => newLeadSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<NewLeadFormValues, unknown, NewLeadFormValues>({
    defaultValues: blankNewLeadValues(),
    resolver: zodResolver(schema) as unknown as Resolver<NewLeadFormValues, unknown, NewLeadFormValues>,
    mode: 'onChange',
  });

  const submit = handleSubmit(async (values) => {
    if (await onSubmit(values)) reset(blankNewLeadValues());
  });

  const select = (name: 'pipeline' | 'source' | 'stage', label: string, values: readonly string[], labels: Record<string, string>) => (
    <RhfTextField control={control} name={name} label={label} select fullWidth>
      {values.map((value) => (
        <MenuItem key={value} value={value}>
          {t(labels[value])}
        </MenuItem>
      ))}
    </RhfTextField>
  );

  return (
    <form noValidate onSubmit={submit} data-testid="new-lead-form">
      <Stack spacing={2} sx={{ pt: 1 }}>
        <RhfTextField control={control} name="name" label={t('marketing.leads.name')} hint={t('marketing.leads.nameHint')} autoFocus fullWidth />
        <RhfTextField control={control} name="company" label={t('marketing.leads.company')} hint={t('marketing.leads.companyHint')} fullWidth />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {select('pipeline', t('marketing.leads.pipeline'), PIPELINES, PIPELINE_LABEL)}
          {select('source', t('marketing.leads.source'), SOURCES, SOURCE_LABEL)}
          {select('stage', t('marketing.leads.stage'), STAGES, STAGE_LABEL)}
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <RhfTextField control={control} name="email" label={t('marketing.leads.email')} type="email" fullWidth />
          <RhfTextField control={control} name="phone" label={t('marketing.leads.phone')} hint={t('marketing.leads.phoneHint')} fullWidth />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <RhfTextField control={control} name="website" label={t('marketing.leads.website')} fullWidth />
          <RhfTextField control={control} name="instagram_handle" label={t('marketing.leads.instagramHandle')} fullWidth />
        </Stack>
        <RhfTextField control={control} name="city" label={t('marketing.leads.city')} hint={t('marketing.leads.cityHint')} fullWidth />
      </Stack>
      <DialogActions sx={{ px: 0, pb: 0 }}>
        <DuncitButton onClick={onCancel} disabled={busy}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" loading={busy} data-testid="new-lead-submit">
          {t('marketing.leads.create')}
        </DuncitButton>
      </DialogActions>
    </form>
  );
}
