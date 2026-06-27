import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useController, useFormContext } from 'react-hook-form';
import {
  Alert,
  Box,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CRM_DYNAMIC_FIELDS } from '../../api/crm.gql';
import type { CrmDynamicField } from '../../api/crm.types';

const ENTITY_LABELS = { VENUE_LEAD: 'venue', HOST_LEAD: 'host', ECOMM_LEAD: 'ecomm' } as const;

interface Props {
  /** Limits the dropdown to fields tagged for this entity. */
  entity: 'VENUE_LEAD' | 'HOST_LEAD' | 'ECOMM_LEAD';
  /**
   * RHF field name holding a JSON-stringified `Record<string, value>`
   * keyed by `CrmDynamicField.name`. We hide the JSON behind the controller
   * and surface a normal per-field input.
   */
  name: string;
}

interface CellProps {
  field: CrmDynamicField;
  value: any;
  onChange: (next: any) => void;
}

function MultiSelectCell({ field, value, onChange }: Readonly<CellProps>) {
  const selected: string[] = Array.isArray(value) ? value : [];
  return (
    <FormControl fullWidth size="small" required={field.required}>
      <InputLabel>{field.label}</InputLabel>
      <Select
        multiple
        value={selected}
        input={<OutlinedInput label={field.label} />}
        onChange={(e) => onChange(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
        renderValue={(sel) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {(sel as string[]).map((v) => {
              const opt = field.options.find((o) => o.value === v);
              return <Chip key={v} size="small" label={opt?.label ?? v} />;
            })}
          </Box>
        )}
      >
        {field.options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            <Checkbox checked={selected.includes(opt.value)} size="small" />
            <ListItemText primary={opt.label} />
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>{field.hint || ' '}</FormHelperText>
    </FormControl>
  );
}

const FieldCell = ({ field, value, onChange }: CellProps) => {
  const hint = field.hint || undefined;
  const placeholder = field.placeholder || undefined;
  // Display the configured default until the user enters their own value.
  const shown = value ?? (field.default_value || '');
  switch (field.kind) {
    case 'textarea':
      return (
        <TextField fullWidth size="small" multiline minRows={2} label={field.label} placeholder={placeholder}
          helperText={hint} required={field.required} value={shown} onChange={(e) => onChange(e.target.value)} />
      );
    case 'number':
      return (
        <TextField fullWidth size="small" type="number" label={field.label} placeholder={placeholder}
          helperText={hint} required={field.required} value={value ?? field.default_value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
      );
    case 'boolean':
      return (
        <FormControlLabel
          control={<Checkbox checked={!!value} onChange={(e) => onChange(e.target.checked)} />}
          label={field.label}
        />
      );
    case 'date':
      return (
        <TextField fullWidth size="small" type="date" label={field.label} helperText={hint} required={field.required}
          InputLabelProps={{ shrink: true }} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} />
      );
    case 'select':
      if (field.multi) return <MultiSelectCell field={field} value={value} onChange={onChange} />;
      return (
        <TextField fullWidth size="small" select label={field.label} helperText={hint} required={field.required}
          value={shown} onChange={(e) => onChange(e.target.value || null)}>
          <MenuItem value=""><em>None</em></MenuItem>
          {field.options.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </TextField>
      );
    case 'text':
    default:
      return (
        <TextField fullWidth size="small" label={field.label} placeholder={placeholder} helperText={hint}
          required={field.required} value={shown} onChange={(e) => onChange(e.target.value)} />
      );
  }
};

/**
 * Renders the admin-defined dynamic fields applicable to `entity`. Reads /
 * writes the JSON-stringified value bag at `name` so the parent form's
 * RHF state stays untouched aside from this one string field.
 */
export default function DynamicFieldsRenderer({ entity, name }: Readonly<Props>) {
  const { control } = useFormContext();
  const { field } = useController({ control, name });
  const { data, loading } = useQuery<{ crmDynamicFields: CrmDynamicField[] }>(CRM_DYNAMIC_FIELDS, {
    variables: { entity, include_inactive: false },
    fetchPolicy: 'cache-first',
  });

  const values = useMemo(() => {
    try {
      return JSON.parse((field.value as string) || '{}') as Record<string, any>;
    } catch {
      return {};
    }
  }, [field.value]);

  const fields = data?.crmDynamicFields ?? [];

  const update = (key: string, next: any) => {
    const merged = { ...values, [key]: next };
    field.onChange(JSON.stringify(merged));
  };

  if (loading && fields.length === 0) {
    return (
      <Stack spacing={1}>
        <Skeleton variant="rounded" height={40} />
        <Skeleton variant="rounded" height={40} />
      </Stack>
    );
  }

  if (!loading && fields.length === 0) {
    return (
      <Alert severity="info">
        No dynamic fields defined for {ENTITY_LABELS[entity]} leads yet. Open
        Settings → Dynamic Fields to add some.
      </Alert>
    );
  }

  return (
    <Stack spacing={1.5}>
      {fields.map((f) => (
        <FieldCell key={f.id} field={f} value={values[f.name]} onChange={(v) => update(f.name, v)} />
      ))}
      <Typography variant="caption" color="text.secondary">
        Edit the catalogue at Settings → Dynamic Fields. Changes here apply to both venue and host
        leads where the field is enabled.
      </Typography>
    </Stack>
  );
}
