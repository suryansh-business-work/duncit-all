import { useEffect, useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormControlLabel, Stack, Switch, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../i18n';
import {
  buildChallengeMappingSchema,
  type ChallengeMappingOptions,
  type ChallengeMappingValues,
} from './challenge-mapping.types';
import { MappingToggles } from './MappingToggles';
import { MultiOptionPicker, SingleOptionPicker } from './OptionPicker';

export interface ChallengeMappingFormProps {
  values: ChallengeMappingValues;
  options: ChallengeMappingOptions;
  saving: boolean;
  onSubmit: (values: ChallengeMappingValues) => Promise<void> | void;
}

/**
 * The challenge settings of one sub-category. Everything but the switch stays
 * out of the way until challenges are switched on; presets and the default
 * template then only offer what the selected tools can run, so an admin cannot
 * save a combination the server would refuse.
 */
export function ChallengeMappingForm({ values, options, saving, onSubmit }: Readonly<ChallengeMappingFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildChallengeMappingSchema(t), [t]);
  const { control, handleSubmit, reset, setValue, getValues, formState } = useForm<ChallengeMappingValues>({
    resolver: zodResolver(schema),
    values,
  });
  useEffect(() => reset(values), [values, reset]);

  const enabled = useWatch({ control, name: 'enabled' });
  const toolIds = useWatch({ control, name: 'allowed_tool_ids' });
  const presets = options.presets.filter((p) => p.toolIds.every((id) => toolIds.includes(id)));
  const templates = options.templates.filter((tpl) => tpl.toolIds.length > 0 && tpl.toolIds.every((id) => toolIds.includes(id)));

  // Unmapping a tool also drops the presets and default template that need it.
  const changeTools = (next: string[]) => {
    const fits = (needs: string[]) => needs.every((id) => next.includes(id));
    setValue('allowed_tool_ids', next, { shouldDirty: true, shouldValidate: true });
    setValue('preset_ids', getValues('preset_ids').filter((id) => fits(options.presets.find((p) => p.id === id)?.toolIds ?? [])), {
      shouldDirty: true,
    });
    const tpl = options.templates.find((o) => o.id === getValues('default_template_id'));
    if (tpl && !fits(tpl.toolIds)) setValue('default_template_id', '', { shouldDirty: true });
  };

  return (
    <Stack component="form" spacing={2} noValidate onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="enabled"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={<Switch checked={field.value} onChange={(_e, c) => field.onChange(c)} />}
            label={t('challenge.mapping.fields.enabled')}
          />
        )}
      />
      {enabled && (
        <>
          <Controller
            name="allowed_tool_ids"
            control={control}
            render={({ field, fieldState }) => (
              <MultiOptionPicker
                label={t('challenge.mapping.fields.allowed_tool_ids')}
                options={options.tools}
                value={field.value}
                onChange={changeTools}
                error={fieldState.error?.message}
                disabled={saving}
              />
            )}
          />
          <Controller
            name="preset_ids"
            control={control}
            render={({ field }) => (
              <MultiOptionPicker
                label={t('challenge.mapping.fields.preset_ids')}
                options={presets}
                value={field.value}
                onChange={field.onChange}
                disabled={saving}
              />
            )}
          />
          <Controller
            name="default_template_id"
            control={control}
            render={({ field }) => (
              <SingleOptionPicker
                label={t('challenge.mapping.fields.default_template_id')}
                noneLabel={t('challenge.mapping.noTemplate')}
                options={templates}
                value={field.value}
                onChange={field.onChange}
                disabled={saving}
              />
            )}
          />
          <Controller
            name="max_competitors"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                type="number"
                size="small"
                label={t('challenge.mapping.fields.max_competitors')}
                helperText={fieldState.error?.message ?? t('challenge.mapping.maxCompetitorsHint')}
                error={!!fieldState.error}
                value={Number.isNaN(field.value) ? '' : field.value}
                onChange={(e) => field.onChange(e.target.value === '' ? Number.NaN : Number(e.target.value))}
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
                disabled={saving}
              />
            )}
          />
          <MappingToggles control={control} disabled={saving} />
        </>
      )}
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton type="submit" variant="contained" disabled={saving || !formState.isDirty}>
          {saving ? t('challenge.mapping.saving') : t('challenge.mapping.save')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
