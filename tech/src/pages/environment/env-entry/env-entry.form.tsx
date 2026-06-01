import { useFormik } from 'formik';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import type { EnvCategoryDef, EnvEntry } from '../queries';
import { emptyValues, envEntrySchema, valuesFromEntry, type EnvEntryFormValues } from './env-entry.types';

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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? `Edit ${initial!.name}` : `New ${def.label} entry`}</DialogTitle>
      <form onSubmit={formik.handleSubmit} noValidate>
        <DialogContent dividers>
          <Stack spacing={1.5}>
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
            {def.fields.map((field) => {
              if (field.bool) {
                return (
                  <FormControlLabel
                    key={field.name}
                    control={
                      <Switch
                        checked={formik.values.config[field.name] === 'true'}
                        onChange={(e) => formik.setFieldValue(`config.${field.name}`, e.target.checked ? 'true' : 'false')}
                      />
                    }
                    label={field.label}
                  />
                );
              }
              return (
                <TextField
                  key={field.name}
                  label={field.label}
                  name={`config.${field.name}`}
                  type={field.secret ? 'password' : field.number ? 'number' : 'text'}
                  value={formik.values.config[field.name] ?? ''}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={Boolean(configError(field.name))}
                  helperText={configError(field.name) || (field.secret ? secretHelper(field.name) : ' ')}
                  fullWidth
                />
              );
            })}
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
