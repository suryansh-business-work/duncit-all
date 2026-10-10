import { useState } from 'react';
import { FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import { useTranslation, type Translate } from '../i18n';
import { CriteriaEditor } from './CriteriaEditor';
import type { JudgeCriterion, ToolConfig, ToolConfigIssue, ToolField } from './fields';

export interface ToolConfigFieldsProps {
  fields: ToolField[];
  value: ToolConfig;
  onChange: (next: ToolConfig) => void;
  issues?: ToolConfigIssue[];
  disabled?: boolean;
}

const label = (t: Translate, key: string) => t(`challenge.toolConfig.fields.${key}`);

function issueText(t: Translate, f: ToolField, issues: ToolConfigIssue[] | undefined) {
  const issue = issues?.find((i) => i.key === f.key);
  return issue ? t(`challenge.toolConfig.errors.${issue.code}`, { vars: { min: f.min ?? '', max: f.max ?? '' } }) : undefined;
}

/** "1, 2, 4, 6" ⇄ [1, 2, 4, 6]; the raw text is kept while the admin types. */
function NumberListField({ f, value, onChange, error, disabled }: Readonly<{
  f: ToolField;
  value: unknown;
  onChange: (v: number[]) => void;
  error?: string;
  disabled?: boolean;
}>) {
  const { t } = useTranslation();
  const [text, setText] = useState(Array.isArray(value) ? value.join(', ') : '');
  return (
    <TextField
      size="small"
      label={label(t, f.key)}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean).map(Number));
      }}
      helperText={error ?? t('challenge.toolConfig.numberListHint')}
      error={!!error}
      disabled={disabled}
    />
  );
}

/**
 * Renders one tool's settings from its field list. Controlled: the parent form
 * owns the config object, so the same editor serves tool defaults, presets and
 * per-template overrides.
 */
export function ToolConfigFields({ fields, value, onChange, issues, disabled }: Readonly<ToolConfigFieldsProps>) {
  const { t } = useTranslation();
  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v });

  return (
    <Stack spacing={1.5}>
      {fields.map((f) => {
        const error = issueText(t, f, issues);
        const current = value[f.key] ?? f.default;
        switch (f.kind) {
          case 'boolean':
            return (
              <FormControlLabel
                key={f.key}
                disabled={disabled}
                control={<Switch checked={current === true} onChange={(_e, c) => set(f.key, c)} />}
                label={label(t, f.key)}
              />
            );
          case 'select':
            return (
              <TextField key={f.key} select size="small" label={label(t, f.key)} value={String(current)} onChange={(e) => set(f.key, e.target.value)} disabled={disabled}>
                {(f.options ?? []).map((o) => (
                  <MenuItem key={o} value={o}>
                    {t(`challenge.toolConfig.options.${o}`)}
                  </MenuItem>
                ))}
              </TextField>
            );
          case 'number_list':
            return <NumberListField key={f.key} f={f} value={current} onChange={(v) => set(f.key, v)} error={error} disabled={disabled} />;
          case 'criteria':
            return <CriteriaEditor key={f.key} value={(current as JudgeCriterion[]) ?? []} onChange={(v) => set(f.key, v)} error={error} disabled={disabled} />;
          case 'number':
            return (
              <TextField
                key={f.key}
                type="number"
                size="small"
                label={label(t, f.key)}
                value={current === null || current === undefined ? '' : String(current)}
                onChange={(e) => set(f.key, e.target.value === '' ? '' : Number(e.target.value))}
                error={!!error}
                helperText={error}
                disabled={disabled}
                slotProps={{ htmlInput: { min: f.min, max: f.max } }}
              />
            );
          default:
            return <TextField key={f.key} size="small" label={label(t, f.key)} value={String(current ?? '')} onChange={(e) => set(f.key, e.target.value)} disabled={disabled} />;
        }
      })}
    </Stack>
  );
}
