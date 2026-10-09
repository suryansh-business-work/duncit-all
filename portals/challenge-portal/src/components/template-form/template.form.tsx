import { useCallback, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { AdminCategorySelect } from '@duncit/category';
import { parseToolConfig, parseToolFields, withDefaults } from '@duncit/challenges';
import type { PresetRow, ToolRow } from '../../graphql/engine';
import { ToolInstanceRow } from './ToolInstanceRow';
import { WinnerRulesEditor, type RankOption } from './WinnerRulesEditor';
import { buildTemplateSchema, MAX_TOOL_INSTANCES, TOTAL_KEY, type TemplateFormValues } from './template.types';

export interface TemplateFormProps {
  values: TemplateFormValues;
  /** Every tool (inactive ones only render where a template already has them). */
  tools: ToolRow[];
  presets: PresetRow[];
  saving: boolean;
  onSubmit: (values: TemplateFormValues) => Promise<void> | void;
  onCancel: () => void;
}

const newInstanceId = () => crypto.randomUUID().slice(0, 8);

export function TemplateForm({ values, tools, presets, saving, onSubmit, onCancel }: Readonly<TemplateFormProps>) {
  const { t } = useTranslation();
  const byId = useMemo(() => new Map(tools.map((tool) => [tool.id, tool])), [tools]);
  const fieldsFor = useMemo(() => {
    const cache = new Map(tools.map((tool) => [tool.id, parseToolFields(tool.config_schema_json)]));
    return (id: string) => cache.get(id) ?? [];
  }, [tools]);
  const isScoring = useCallback((id: string) => !!byId.get(id)?.produces_score, [byId]);
  const schema = useMemo(() => buildTemplateSchema(t, fieldsFor, isScoring), [t, fieldsFor, isScoring]);
  const { control, handleSubmit, setValue, formState } = useForm<TemplateFormValues>({ resolver: zodResolver(schema), values });
  const instances = useFieldArray({ control, name: 'tool_instances' });
  const watched = useWatch({ control, name: 'tool_instances' });
  const [superId, categoryId, subId] = useWatch({ control, name: ['super_id', 'category_id', 'sub_id'] });
  const [adding, setAdding] = useState('');
  const runnable = tools.filter((tool) => tool.status === 'ACTIVE' && tool.engine_ready);
  const defaultsOf = (tool: ToolRow | undefined) => (tool ? withDefaults(fieldsFor(tool.id), parseToolConfig(tool.default_config_json)) : {});

  const addTool = (toolId: string) => {
    const tool = byId.get(toolId);
    if (!tool) return;
    instances.append({ instance_id: newInstanceId(), tool_id: tool.id, tool_type: tool.tool_type, preset_id: '', label: tool.name, config: defaultsOf(tool) });
    setAdding('');
  };
  const rankOptions: RankOption[] = [
    { value: TOTAL_KEY, label: t('challenge.templates.total') },
    ...watched.filter((i) => isScoring(i.tool_id)).map((i) => ({ value: i.instance_id, label: i.label || byId.get(i.tool_id)?.name || i.instance_id })),
  ];

  return (
    <Stack component="form" spacing={2} noValidate onSubmit={handleSubmit(onSubmit)}>
      <Controller name="name" control={control} render={({ field, fieldState }) => (
        <TextField {...field} size="small" label={t('challenge.form.nameLabel')} required error={!!fieldState.error} helperText={fieldState.error?.message} disabled={saving} />
      )} />
      <Controller name="description" control={control} render={({ field }) => (
        <TextField {...field} size="small" multiline minRows={2} label={t('challenge.form.descriptionLabel')} disabled={saving} />
      )} />
      <AdminCategorySelect
        value={{ super_id: superId, super_name: '', category_id: categoryId, category_name: '', sub_id: subId, sub_name: '' }}
        onChange={(next) => {
          setValue('super_id', next.super_id, { shouldDirty: true });
          setValue('category_id', next.category_id, { shouldDirty: true });
          setValue('sub_id', next.sub_id, { shouldDirty: true });
        }}
        hint={t('challenge.templates.scopeHint')}
        disabled={saving}
      />
      <Controller name="participant_mode" control={control} render={({ field }) => (
        <TextField select size="small" label={t('challenge.templates.fields.mode')} {...field} disabled={saving}>
          <MenuItem value="INDIVIDUAL">{t('challenge.templates.modeIndividual')}</MenuItem>
          <MenuItem value="TEAM">{t('challenge.templates.modeTeam')}</MenuItem>
        </TextField>
      )} />
      <Typography variant="subtitle2" component="h3">{t('challenge.templates.tools')}</Typography>
      {instances.fields.map((f, i) => {
        const tool = byId.get(f.tool_id);
        return (
          <ToolInstanceRow
            key={f.id}
            index={i}
            control={control}
            toolName={tool?.name ?? f.tool_type}
            fields={fieldsFor(f.tool_id)}
            presets={presets.filter((p) => p.tool_id === f.tool_id && p.is_active)}
            toolDefaults={defaultsOf(tool)}
            onRemove={() => instances.remove(i)}
            onConfigReset={(config) => setValue(`tool_instances.${i}.config`, config, { shouldDirty: true })}
            disabled={saving}
          />
        );
      })}
      <TextField select size="small" label={t('challenge.templates.addTool')} value={adding} onChange={(e) => addTool(e.target.value)} disabled={saving || instances.fields.length >= MAX_TOOL_INSTANCES}>
        {runnable.map((tool) => (
          <MenuItem key={tool.id} value={tool.id}>{tool.name}</MenuItem>
        ))}
      </TextField>
      <WinnerRulesEditor control={control} options={rankOptions} error={formState.errors.winner_rules?.rank_by?.message} disabled={saving} />
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton onClick={onCancel} disabled={saving}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton type="submit" variant="contained" disabled={saving || !formState.isDirty}>
          {saving ? t('shell.common.saving') : t('shell.common.save')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
