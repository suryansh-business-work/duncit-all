import { useId } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Checkbox, FormControlLabel, FormGroup, FormHelperText, FormLabel, MenuItem, Stack, TextField } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { LEAD_TYPES } from '../../components/lead-quality/qualityLabels';
import { LEAD_KIND_LABEL_KEY } from '../../lib/leadKinds';
import { SOURCE_KIND_KEY } from '../../lib/leadResearchLabels';
import { DISCOVERY_SOURCES, type LeadDiscoveryFormValues } from './lead-discovery.schema';

type TextName = 'category' | 'keywords';
type NumberName = 'target_count' | 'min_score';

interface TextProps {
  name: TextName;
  label: string;
  hint: string;
  maxLength: number;
}

/** A free-text field; the counter stops at what the server keeps. */
export function DiscoveryTextField({ name, label, hint, maxLength }: Readonly<TextProps>) {
  const { control } = useFormContext<LeadDiscoveryFormValues>();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          size="small"
          fullWidth
          label={label}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? hint}
          slotProps={{ htmlInput: { maxLength, 'data-testid': `lead-discovery-${name}` } }}
        />
      )}
    />
  );
}

interface NumberProps {
  name: NumberName;
  label: string;
  hint: string;
  min: number;
  max: number;
  required?: boolean;
}

/** A number field. An empty box is null (no minimum score) or NaN, which the schema refuses. */
export function DiscoveryNumberField({ name, label, hint, min, max, required }: Readonly<NumberProps>) {
  const { control } = useFormContext<LeadDiscoveryFormValues>();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          name={field.name}
          inputRef={field.ref}
          onBlur={field.onBlur}
          value={typeof field.value === 'number' && Number.isFinite(field.value) ? field.value : ''}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === '') field.onChange(required ? Number.NaN : null);
            else field.onChange(Number(raw));
          }}
          type="number"
          size="small"
          fullWidth
          required={required}
          label={label}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? hint}
          slotProps={{ htmlInput: { min, max, inputMode: 'decimal', 'data-testid': `lead-discovery-${name}` } }}
        />
      )}
    />
  );
}

/** Which kind of lead to look for, named as the CRM names each kind. */
export function LeadTypeField() {
  const { t } = useTranslation();
  const { control } = useFormContext<LeadDiscoveryFormValues>();
  return (
    <Controller
      name="lead_type"
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          select
          size="small"
          fullWidth
          required
          label={t('crm.leadResearch.leadType')}
          helperText={t('crm.leadResearch.leadTypeHint')}
          slotProps={{ htmlInput: { 'data-testid': 'lead-discovery-lead-type' } }}
        >
          {LEAD_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {t(LEAD_KIND_LABEL_KEY[type])}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}

/** Instagram and/or Google Maps; none ticked means the lead type's default sources. */
export function SourcesField() {
  const { t } = useTranslation();
  const { control } = useFormContext<LeadDiscoveryFormValues>();
  const labelId = useId();
  return (
    <Controller
      name="sources"
      control={control}
      render={({ field }) => {
        const toggle = (source: (typeof DISCOVERY_SOURCES)[number]) =>
          field.onChange(field.value.includes(source) ? field.value.filter((value) => value !== source) : [...field.value, source]);
        return (
          <Stack spacing={0.5}>
            <FormLabel id={labelId}>{t('crm.leadResearch.sources')}</FormLabel>
            <FormGroup row role="group" aria-labelledby={labelId}>
              {DISCOVERY_SOURCES.map((source) => (
                <FormControlLabel
                  key={source}
                  label={t(SOURCE_KIND_KEY[source])}
                  control={<Checkbox size="small" checked={field.value.includes(source)} onChange={() => toggle(source)} />}
                />
              ))}
            </FormGroup>
            <FormHelperText>{t('crm.leadResearch.sourcesHint')}</FormHelperText>
          </Stack>
        );
      }}
    />
  );
}
