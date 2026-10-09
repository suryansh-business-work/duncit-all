import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Autocomplete, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { ToolConfigFields, toolConfigIssues, type ToolField } from '@duncit/challenges';
import type { CategoryPathOption } from '../../lib/categoryPaths';
import { buildToolSchema, type ToolFormValues } from './tool.types';

export interface ToolFormProps {
  values: ToolFormValues;
  fields: ToolField[];
  /** Roadmap tools the engine cannot run yet: settings are read-only and activation is off. */
  engineReady: boolean;
  categories: CategoryPathOption[];
  saving: boolean;
  onSubmit: (values: ToolFormValues) => Promise<void> | void;
  onCancel: () => void;
}

export function ToolForm({ values, fields, engineReady, categories, saving, onSubmit, onCancel }: Readonly<ToolFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildToolSchema(t, fields), [t, fields]);
  const { control, handleSubmit, formState } = useForm<ToolFormValues>({ resolver: zodResolver(schema), values });
  const config = useWatch({ control, name: 'config' });
  const issues = useMemo(() => toolConfigIssues(fields, config), [fields, config]);
  const locked = saving || !engineReady;

  return (
    <Stack component="form" spacing={2} noValidate onSubmit={handleSubmit(onSubmit)}>
      {!engineReady && <Alert severity="info">{t('challenge.tools.notReady')}</Alert>}
      <Controller
        name="name"
        control={control}
        render={({ field, fieldState }) => (
          <TextField {...field} size="small" label={t('challenge.tools.fields.name')} required error={!!fieldState.error} helperText={fieldState.error?.message} disabled={saving} />
        )}
      />
      <Controller
        name="description"
        control={control}
        render={({ field, fieldState }) => (
          <TextField {...field} size="small" multiline minRows={2} label={t('challenge.tools.fields.description')} error={!!fieldState.error} helperText={fieldState.error?.message} disabled={saving} />
        )}
      />
      <Controller
        name="active"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            disabled={locked}
            control={<Switch checked={field.value} onChange={(_e, c) => field.onChange(c)} />}
            label={t('challenge.tools.fields.active')}
          />
        )}
      />
      {fields.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="subtitle2" component="h3">
            {t('challenge.tools.defaults')}
          </Typography>
          <Controller
            name="config"
            control={control}
            render={({ field }) => (
              <ToolConfigFields fields={fields} value={field.value} onChange={field.onChange} issues={issues} disabled={locked} />
            )}
          />
        </Stack>
      )}
      <Controller
        name="category_ids"
        control={control}
        render={({ field }) => (
          <Autocomplete
            multiple
            size="small"
            disabled={locked}
            options={categories}
            value={categories.filter((c) => field.value.includes(c.id))}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_e, next) => field.onChange(next.map((o) => o.id))}
            renderInput={(params) => (
              <TextField {...params} label={t('challenge.tools.fields.categories')} helperText={t('challenge.tools.categoriesHint')} />
            )}
          />
        )}
      />
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton onClick={onCancel} disabled={saving}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" disabled={saving || !formState.isDirty}>
          {saving ? t('shell.common.saving') : t('shell.common.save')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
