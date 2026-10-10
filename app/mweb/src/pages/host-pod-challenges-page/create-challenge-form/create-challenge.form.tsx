import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MenuItem, Stack, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../../i18n/useTranslation';
import { buildCreateChallengeSchema, type CreateChallengeValues } from './create-challenge.types';

export interface CreateChallengeFormProps {
  /** Only the templates this pod's category allows (from the server). */
  templates: { id: string; name: string }[];
  defaultTemplateId: string | null;
  saving: boolean;
  onSubmit: (values: CreateChallengeValues) => Promise<boolean>;
}

export function CreateChallengeForm({ templates, defaultTemplateId, saving, onSubmit }: Readonly<CreateChallengeFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildCreateChallengeSchema(t), [t]);
  const fallback = templates.some((x) => x.id === defaultTemplateId) ? (defaultTemplateId ?? '') : (templates[0]?.id ?? '');
  const { control, handleSubmit, reset } = useForm<CreateChallengeValues>({
    resolver: zodResolver(schema),
    defaultValues: { template_id: fallback, name: '' },
  });
  const submit = async (values: CreateChallengeValues) => {
    if (await onSubmit(values)) reset({ template_id: values.template_id, name: '' });
  };

  return (
    <Stack component="form" spacing={1.5} direction={{ xs: 'column', sm: 'row' }} noValidate onSubmit={handleSubmit(submit)} sx={{ alignItems: { sm: 'flex-start' } }}>
      <Controller
        name="template_id"
        control={control}
        render={({ field, fieldState }) => (
          <TextField select size="small" label={t('mweb.challenge.fields.template')} {...field} error={!!fieldState.error} helperText={fieldState.error?.message} disabled={saving} sx={{ flex: 1, minWidth: 200 }}>
            {templates.map((tpl) => (
              <MenuItem key={tpl.id} value={tpl.id}>
                {tpl.name}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <Controller
        name="name"
        control={control}
        render={({ field, fieldState }) => (
          <TextField {...field} size="small" label={t('mweb.challenge.fields.challengeName')} helperText={fieldState.error?.message ?? t('mweb.challenge.nameHint')} error={!!fieldState.error} disabled={saving} sx={{ flex: 1 }} />
        )}
      />
      <DuncitButton type="submit" variant="contained" startIcon={<AddIcon />} disabled={saving}>
        {t('mweb.challenge.addChallenge')}
      </DuncitButton>
    </Stack>
  );
}
