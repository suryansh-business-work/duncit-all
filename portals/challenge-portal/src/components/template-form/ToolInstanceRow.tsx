import { useMemo } from 'react';
import { Controller, useWatch, type Control } from 'react-hook-form';
import { Accordion, AccordionDetails, AccordionSummary, IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { useTranslation } from '@duncit/shell';
import { ToolConfigFields, parseToolConfig, toolConfigIssues, withDefaults, type ToolField } from '@duncit/challenges';
import type { PresetRow } from '../../graphql/engine';
import type { TemplateFormValues } from './template.types';

interface Props {
  index: number;
  control: Control<TemplateFormValues>;
  toolName: string;
  fields: ToolField[];
  /** Active presets of this instance's tool. */
  presets: PresetRow[];
  /** The tool's own defaults, used when no preset is chosen. */
  toolDefaults: Record<string, unknown>;
  onRemove: () => void;
  onConfigReset: (config: Record<string, unknown>) => void;
  disabled: boolean;
}

/** One tool inside a template: its label, an optional preset, and its settings. */
export function ToolInstanceRow({ index, control, toolName, fields, presets, toolDefaults, onRemove, onConfigReset, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const config = useWatch({ control, name: `tool_instances.${index}.config` });
  const issues = useMemo(() => toolConfigIssues(fields, config), [fields, config]);

  return (
    <Accordion disableGutters variant="outlined">
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {toolName}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Controller
              name={`tool_instances.${index}.label`}
              control={control}
              render={({ field, fieldState }) => (
                <TextField {...field} size="small" label={t('challenge.templates.fields.label')} error={!!fieldState.error} helperText={fieldState.error?.message} disabled={disabled} sx={{ flex: 1 }} />
              )}
            />
            <Controller
              name={`tool_instances.${index}.preset_id`}
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  size="small"
                  label={t('challenge.templates.fields.preset')}
                  value={field.value}
                  onChange={(e) => {
                    const preset = presets.find((p) => p.id === e.target.value);
                    field.onChange(e.target.value);
                    onConfigReset(withDefaults(fields, preset ? parseToolConfig(preset.config_json) : toolDefaults));
                  }}
                  disabled={disabled}
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="">{t('challenge.templates.noPreset')}</MenuItem>
                  {presets.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Tooltip title={t('challenge.templates.removeTool')}>
              <span>
                <IconButton aria-label={t('challenge.templates.removeTool')} onClick={onRemove} disabled={disabled}>
                  <DeleteOutlinedIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
          <Controller
            name={`tool_instances.${index}.config`}
            control={control}
            render={({ field }) => <ToolConfigFields fields={fields} value={field.value} onChange={field.onChange} issues={issues} disabled={disabled} />}
          />
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
