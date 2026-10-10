import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import { FormSaveCancel } from '../FormSaveCancel';
import { useTranslation } from '@duncit/shell';
import { ToolConfigFields, parseToolConfig, parseToolFields, toolConfigIssues, withDefaults } from '@duncit/challenges';
import type { ToolRow } from '../../graphql/engine';
import { buildPresetSchema, type PresetFormValues } from './preset.types';

export interface PresetFormProps {
  values: PresetFormValues;
  /** Active, engine-ready tools a NEW preset may configure. */
  tools: ToolRow[];
  isNew: boolean;
  saving: boolean;
  onSubmit: (values: PresetFormValues) => Promise<void> | void;
  onCancel: () => void;
}

export function PresetForm({ values, tools, isNew, saving, onSubmit, onCancel }: Readonly<PresetFormProps>) {
  const { t } = useTranslation();
  const fieldsFor = useMemo(() => {
    const byId = new Map(tools.map((tool) => [tool.id, parseToolFields(tool.config_schema_json)]));
    return (id: string) => byId.get(id) ?? [];
  }, [tools]);
  const schema = useMemo(() => buildPresetSchema(t, fieldsFor), [t, fieldsFor]);
  const { control, handleSubmit, setValue, formState } = useForm<PresetFormValues>({ resolver: zodResolver(schema), values });
  const toolId = useWatch({ control, name: 'tool_id' });
  const config = useWatch({ control, name: 'config' });
  const fields = fieldsFor(toolId);
  const issues = useMemo(() => toolConfigIssues(fields, config), [fields, config]);

  // A new preset starts from the chosen tool's admin defaults.
  const pickTool = (id: string) => {
    const tool = tools.find((x) => x.id === id);
    setValue('tool_id', id, { shouldDirty: true, shouldValidate: true });
    setValue('config', withDefaults(fieldsFor(id), parseToolConfig(tool?.default_config_json)), { shouldDirty: true });
  };

  return (
    <Stack component="form" spacing={2} noValidate onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="tool_id"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            select
            size="small"
            label={t('challenge.presets.fields.tool')}
            value={field.value}
            onChange={(e) => pickTool(e.target.value)}
            disabled={!isNew || saving}
            error={!!fieldState.error}
            helperText={fieldState.error?.message}
            required
          >
            {tools.map((tool) => (
              <MenuItem key={tool.id} value={tool.id}>
                {tool.name}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <Controller
        name="name"
        control={control}
        render={({ field, fieldState }) => (
          <TextField {...field} size="small" label={t('challenge.presets.fields.name')} required error={!!fieldState.error} helperText={fieldState.error?.message} disabled={saving} />
        )}
      />
      <Controller
        name="active"
        control={control}
        render={({ field }) => (
          <FormControlLabel disabled={saving} control={<Switch checked={field.value} onChange={(_e, c) => field.onChange(c)} />} label={t('challenge.presets.fields.active')} />
        )}
      />
      {fields.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="subtitle2" component="h3">
            {t('challenge.presets.settings')}
          </Typography>
          <Controller
            name="config"
            control={control}
            render={({ field }) => <ToolConfigFields fields={fields} value={field.value} onChange={field.onChange} issues={issues} disabled={saving} />}
          />
        </Stack>
      )}
      <FormSaveCancel saving={saving} pristine={!formState.isDirty} onCancel={onCancel} />
    </Stack>
  );
}
