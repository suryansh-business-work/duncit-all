import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, type DocumentNode } from '@apollo/client';
import { Button, Divider, MenuItem, Snackbar, Stack, TextField, Typography } from '@mui/material';
import ChangeRequestList from './ChangeRequestList';
import { MY_ECOMM_CHANGE_REQUESTS, SUBMIT_ECOMM_CHANGE } from './queries';

export interface RequestField {
  name: string;
  label: string;
  hint: string;
  multiline?: boolean;
  numeric?: boolean;
}

export interface EcommRequestConfig {
  kind: 'BRAND' | 'PRODUCT';
  title: string;
  subtitle: string;
  entitiesQuery: DocumentNode;
  entitiesKey: string;
  labelKey: string;
  fields: RequestField[];
}

/** Turn an entity's current field values into RHF string form values. */
function toValues(fields: RequestField[], entity: any): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f.name, String(entity?.[f.name] ?? '')]));
}

/** Diff the submitted form against the entity → the JSON payload + reviewer rows. */
function buildDiff(fields: RequestField[], entity: any, form: Record<string, string>) {
  const payload: Record<string, unknown> = {};
  const details: { label: string; value: string }[] = [];
  fields.forEach((f) => {
    /* v8 ignore next -- RHF always yields a string for these seeded fields; `?? ''` is defensive */
    const next = (form[f.name] ?? '').trim();
    if (next === String(entity?.[f.name] ?? '').trim()) return;
    payload[f.name] = f.numeric ? Number(next) : next;
    details.push({ label: f.label, value: next });
  });
  return { payload, details };
}

/** A generic "edit-as-request" page: pick a brand/product, edit fields (each with
 * an approval hint), and submit the change for admin review (Task B item 2). */
export default function EcommRequestPage({ config }: Readonly<{ config: EcommRequestConfig }>) {
  const { data } = useQuery(config.entitiesQuery, { fetchPolicy: 'cache-and-network' });
  const entities: any[] = data?.[config.entitiesKey] ?? [];
  const [selectedId, setSelectedId] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const selected = entities.find((entity) => entity.id === selectedId) ?? null;

  const schema = useMemo(
    () => z.object(Object.fromEntries(config.fields.map((f) => [f.name, z.string().optional()]))),
    [config.fields],
  );
  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(schema),
    values: toValues(config.fields, selected),
  });
  const [submit, { loading }] = useMutation(SUBMIT_ECOMM_CHANGE, {
    refetchQueries: [{ query: MY_ECOMM_CHANGE_REQUESTS, variables: { kind: config.kind } }],
  });

  const onSubmit = handleSubmit(async (form) => {
    /* v8 ignore start -- the submit button only renders once an item is selected */
    if (!selected) {
      setNotice('Pick an item to edit first.');
      return;
    }
    /* v8 ignore stop */
    const { payload, details } = buildDiff(config.fields, selected, form as Record<string, string>);
    if (details.length === 0) {
      setNotice('Change at least one field before submitting.');
      return;
    }
    try {
      await submit({
        variables: {
          input: {
            kind: config.kind,
            target_id: selected.id,
            target_name: String(selected[config.labelKey] ?? ''),
            details,
            payload: JSON.stringify(payload),
          },
        },
      });
      setNotice('Change request submitted for approval.');
      setSelectedId('');
      reset(Object.fromEntries(config.fields.map((f) => [f.name, ''])));
    } catch (error: any) {
      /* v8 ignore next -- Apollo rejects with a message; the string fallback is defensive */
      setNotice(error?.message ?? 'Could not submit request.');
    }
  });

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h4" fontWeight={700}>
          {config.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {config.subtitle}
        </Typography>
      </div>

      <Stack spacing={2} sx={{ p: 2.5, border: 1, borderColor: 'divider', borderRadius: 2, maxWidth: 640 }}>
        <TextField
          select
          label={`Choose a ${config.kind === 'BRAND' ? 'brand' : 'product'}`}
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          helperText="Its current values pre-fill the form below."
          fullWidth
        >
          <MenuItem value="">
            <em>Select…</em>
          </MenuItem>
          {entities.map((entity) => (
            <MenuItem key={entity.id} value={entity.id}>
              {String(entity[config.labelKey] ?? '')}
            </MenuItem>
          ))}
        </TextField>

        {selected && (
          <>
            <Divider />
            {config.fields.map((field) => (
              <Controller
                key={field.name}
                name={field.name}
                control={control}
                render={({ field: rhf, fieldState }) => (
                  <TextField
                    {...rhf}
                    label={field.label}
                    /* v8 ignore next 2 -- the request fields use optional string schema, so they never error */
                    helperText={fieldState.error?.message ?? field.hint}
                    error={!!fieldState.error}
                    type={field.numeric ? 'number' : 'text'}
                    multiline={field.multiline}
                    minRows={field.multiline ? 2 : undefined}
                    fullWidth
                  />
                )}
              />
            ))}
            <Button variant="contained" onClick={onSubmit} disabled={loading} sx={{ alignSelf: 'flex-start' }}>
              Submit change request
            </Button>
          </>
        )}
      </Stack>

      <div>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Your requests
        </Typography>
        <ChangeRequestList kind={config.kind} />
      </div>

      <Snackbar
        open={!!notice}
        autoHideDuration={3600}
        onClose={() => setNotice(null)}
        message={notice ?? ''}
      />
    </Stack>
  );
}
