import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import { CRM_DYNAMIC_FIELDS } from '../api/crm.gql';
import type { CrmDynamicField } from '../api/crm.types';
import { LeadDetailRow } from './LeadDetailCard';

interface Props {
  entity: 'VENUE_LEAD' | 'HOST_LEAD' | 'ECOMM_LEAD';
  /** JSON-stringified value map from the lead. */
  json: string;
}

/** Dynamic values come from JSON, so a printable value is always a scalar. */
const asText = (raw: unknown): string => String(raw as string | number | boolean);

const fmt = (field: CrmDynamicField, raw: unknown): string => {
  if (raw === null || raw === undefined || raw === '') return '—';
  if (field.kind === 'boolean') return raw ? 'Yes' : 'No';
  if (field.kind === 'date') {
    const d = new Date(asText(raw));
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }
  if (field.kind === 'select') {
    // Map stored option value(s) back to their human label(s). Handles both
    // single-select (string) and multi-select (string[]).
    const labelFor = (v: unknown) => field.options.find((o) => o.value === v)?.label ?? String(v);
    if (Array.isArray(raw)) return raw.length ? raw.map(labelFor).join(', ') : '—';
    return labelFor(raw);
  }
  return asText(raw);
};

/**
 * Read-only renderer for an entity's dynamic-field values. Fetches the
 * applicable field definitions, then prints each as a labelled row. Empty
 * state (no fields configured) is handled by the caller's tab.
 */
export default function DynamicValuesView({ entity, json }: Readonly<Props>) {
  const { data, loading } = useQuery<{ crmDynamicFields: CrmDynamicField[] }>(CRM_DYNAMIC_FIELDS, {
    variables: { entity, include_inactive: false },
    fetchPolicy: 'cache-first',
  });

  const values = useMemo(() => {
    try {
      return JSON.parse(json || '{}') as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [json]);

  const fields = data?.crmDynamicFields ?? [];

  if (loading && fields.length === 0) return null;
  if (fields.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No custom fields defined yet. Open Settings → Dynamic Fields to add some.
      </Typography>
    );
  }

  return (
    <Box>
      <Stack spacing={0.25}>
        {fields.map((f) => (
          <LeadDetailRow key={f.id} label={f.label} value={fmt(f, values[f.name])} />
        ))}
      </Stack>
    </Box>
  );
}
