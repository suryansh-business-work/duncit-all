import { useFormik } from 'formik';
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

export default function EnvEntryForm({ open, def, initial, busy, testing, onClose, onSubmit, onTest }: Props) {
  const isEdit = !!initial;
  const formik = useFormik<EnvEntryFormValues>({
    initialValues: initial ? valuesFromEntry(initial) : emptyValues(),
    validationSchema: envEntrySchema(def, isEdit),
    enableReinitialize: true,
    onSubmit,
  });

  const configError = (name: string) =>
    (formik.touched.config as any)?.[name] && (formik.errors.config as any)?.[name];

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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? `Edit ${initial!.name}` : `New ${def.label} entry`}</DialogTitle>
      <form onSubmit={formik.handleSubmit} noValidate>
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
            <TextField
              label="Name"
              name="name"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={(formik.touched.name && formik.errors.name) || 'A label to tell entries apart'}
              fullWidth
              required
              autoComplete="off"
              inputProps={{ autoComplete: 'off', 'data-1p-ignore': true, 'data-lpignore': true }}
            />
            <TextField
              label="Description"
              name="description"
              value={formik.values.description}
              onChange={formik.handleChange}
              fullWidth
              multiline
              minRows={2}
            />
            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={<Switch checked={formik.values.is_default} onChange={(e) => formik.setFieldValue('is_default', e.target.checked)} />}
                label="Default"
              />
              <FormControlLabel
                control={<Switch checked={formik.values.is_active} onChange={(e) => formik.setFieldValue('is_active', e.target.checked)} />}
                label="Active"
              />
            </Stack>

            <Typography variant="overline" color="text.secondary" sx={{ pt: 1 }}>{def.label} config</Typography>
            {def.fields.map((field) => (
              <ConfigField
                key={field.name}
                field={field}
                value={formik.values.config[field.name] ?? ''}
                error={configError(field.name)}
                helperText={fieldHelper(field)}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                onToggleBool={(name, checked) => formik.setFieldValue(`config.${name}`, checked ? 'true' : 'false')}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between' }}>
          {isEdit && onTest ? (
            <Button startIcon={<ScienceIcon />} onClick={() => onTest(initial!)} disabled={testing}>
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
