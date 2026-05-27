import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useField } from 'formik';
import {
  Alert,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CRM_DYNAMIC_FIELDS } from '../../api/crm.gql';
import type { CrmDynamicField } from '../../api/crm.types';

interface Props {
  /** Limits the dropdown to fields tagged for this entity. */
  entity: 'VENUE_LEAD' | 'HOST_LEAD';
  /**
   * Formik field name holding a JSON-stringified `Record<string, value>`
   * keyed by `CrmDynamicField.name`. We hide the JSON behind helpers and
   * surface a normal per-field input.
   */
  name: string;
}

interface CellProps {
  field: CrmDynamicField;
  value: any;
  onChange: (next: any) => void;
}

const FieldCell = ({ field, value, onChange }: CellProps) => {
  switch (field.kind) {
    case 'textarea':
      return (
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={2}
          label={field.label}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'number':
      return (
        <TextField
          fullWidth
          size="small"
          type="number"
          label={field.label}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
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
        <TextField
          fullWidth
          size="small"
          type="date"
          label={field.label}
          InputLabelProps={{ shrink: true }}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
    case 'select':
      return (
        <TextField
          fullWidth
          size="small"
          select
          label={field.label}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {field.options.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt}
            </MenuItem>
          ))}
        </TextField>
      );
    case 'text':
    default:
      return (
        <TextField
          fullWidth
          size="small"
          label={field.label}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
};

/**
 * Renders the admin-defined dynamic fields applicable to `entity`. Reads /
 * writes the JSON-stringified value bag at `name` so the parent form's
 * Formik state stays untouched aside from this one string field.
 */
export default function DynamicFieldsRenderer({ entity, name }: Props) {
  const [field, , helpers] = useField<string>(name);
  const { data, loading } = useQuery<{ crmDynamicFields: CrmDynamicField[] }>(CRM_DYNAMIC_FIELDS, {
    variables: { entity, include_inactive: false },
    fetchPolicy: 'cache-first',
  });

  const values = useMemo(() => {
    try {
      return JSON.parse(field.value || '{}') as Record<string, any>;
    } catch {
      return {};
    }
  }, [field.value]);

  const fields = data?.crmDynamicFields ?? [];

  const update = (key: string, next: any) => {
    const merged = { ...values, [key]: next };
    helpers.setValue(JSON.stringify(merged));
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
        No dynamic fields defined for {entity === 'VENUE_LEAD' ? 'venue' : 'host'} leads yet. Open
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
