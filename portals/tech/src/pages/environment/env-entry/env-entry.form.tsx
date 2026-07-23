import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Link,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ScienceIcon from '@mui/icons-material/Science';
import type { EnvCategoryDef, EnvEntry, EnvFieldDef } from '../queries';
import { emptyValues, envEntrySchema, valuesFromEntry, type EnvEntryFormValues } from './env-entry.types';
import ConfigField from './ConfigField';

interface Props {
  open: boolean;
  def: EnvCategoryDef;
  initial?: EnvEntry | null;
  busy?: boolean;
  testing?: boolean;
  onClose: () => void;
  onSubmit: (values: EnvEntryFormValues) => Promise<void> | void;
  onTest?: (entry: EnvEntry) => void;
}

export default function EnvEntryForm({ open, def, initial, busy, testing, onClose, onSubmit, onTest }: Readonly<Props>) {
  const isEdit = !!initial;
  const defaults = initial ? valuesFromEntry(initial) : emptyValues();
  const { control, handleSubmit, reset } = useForm<EnvEntryFormValues>({
    defaultValues: defaults,
    resolver: zodResolver(envEntrySchema(def, isEdit)),
    mode: 'all',
  });

  useEffect(() => {
    reset(initial ? valuesFromEntry(initial) : emptyValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, def]);

  const secretHelper = (name: string) => {
    if (!isEdit) return 'Required';
    return initial?.secrets.find((s) => s.key === `has_${name}`)?.present
      ? 'Leave blank to keep existing'
      : 'Required';
  };

  const fieldHelper = (field: EnvFieldDef) => {
    if (field.hint) return field.hint;
    if (field.secret) return secretHelper(field.name);
    return ' ';
  };

  // The first secret field is the only one enforced as required, and only on create.
  const firstSecretField = def.fields.find((f) => f.secret);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? `Edit ${initial.name}` : `New ${def.label} entry`}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            {def.docUrl && (
              <Typography variant="body2" color="text.secondary">
                Where to find these?{' '}
                <Link href={def.docUrl} target="_blank" rel="noopener noreferrer" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                  Open {def.label} dashboard
                  <OpenInNewIcon sx={{ fontSize: 14 }} />
                </Link>
              </Typography>
            )}
            <Controller
              control={control}
              name="name"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Name"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ?? 'A label to tell entries apart'}
                  fullWidth
                  required
                  autoComplete="off"
                  inputProps={{ autoComplete: 'off', 'data-1p-ignore': true, 'data-lpignore': true }}
                />
              )}
            />
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <TextField {...field} label="Description" fullWidth multiline minRows={2} />
              )}
            />
            <Stack direction="row" spacing={2}>
              <Controller
                control={control}
                name="is_default"
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                    label="Default"
                  />
                )}
              />
              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                    label="Active"
                  />
                )}
              />
            </Stack>

            <Typography variant="overline" color="text.secondary" sx={{ pt: 1 }}>{def.label} config</Typography>
            {def.fields.map((field) => (
              <Controller
                key={field.name}
                control={control}
                name={`config.${field.name}`}
                defaultValue=""
                render={({ field: rhfField, fieldState }) => (
                  <ConfigField
                    field={field}
                    value={rhfField.value}
                    error={fieldState.error?.message ?? false}
                    helperText={fieldHelper(field)}
                    required={!isEdit && field === firstSecretField}
                    onChange={(e) => rhfField.onChange(e.target.value)}
                    onBlur={rhfField.onBlur}
                    onToggleBool={(_name, checked) => rhfField.onChange(checked ? 'true' : 'false')}
                  />
                )}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between' }}>
          {isEdit && onTest ? (
            <Button startIcon={<ScienceIcon />} onClick={() => onTest(initial)} disabled={testing}>
              {testing ? 'Testing…' : 'Test connection'}
            </Button>
          ) : <span />}
          <Stack direction="row" spacing={1}>
            <Button onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
          </Stack>
        </DialogActions>
      </form>
    </Dialog>
  );
}
