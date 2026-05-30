import { useFormik } from 'formik';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import type { IntegrationProvider, IntegrationProviderType } from '../queries';
import {
  TYPE_FIELDS,
  TYPE_OPTIONS,
  emptyValues,
  integrationSchema,
  valuesFromProvider,
  type IntegrationFormValues,
} from './integration-provider.types';

interface Props {
  open: boolean;
  initial?: IntegrationProvider | null;
  busy?: boolean;
  testing?: boolean;
  onClose: () => void;
  onSubmit: (values: IntegrationFormValues) => Promise<void> | void;
  onTest?: (provider: IntegrationProvider) => void;
}

export default function IntegrationProviderForm({
  open,
  initial,
  busy,
  testing,
  onClose,
  onSubmit,
  onTest,
}: Props) {
  const isEdit = !!initial;
  const formik = useFormik<IntegrationFormValues>({
    initialValues: initial ? valuesFromProvider(initial) : emptyValues(),
    validationSchema: integrationSchema(isEdit),
    enableReinitialize: true,
    onSubmit,
  });

  const fields = TYPE_FIELDS[formik.values.type];
  const configError = (name: string) =>
    (formik.touched.config as any)?.[name] && (formik.errors.config as any)?.[name];

  const secretHelper = (hasFlag?: keyof IntegrationProvider['config']) => {
    if (!isEdit || !hasFlag) return 'Required';
    return initial && (initial.config as any)[hasFlag] ? 'Leave blank to keep existing' : 'Required';
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? `Edit ${initial!.name}` : 'New integration'}</DialogTitle>
      <form onSubmit={formik.handleSubmit} noValidate>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label="Name"
                name="name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.name && Boolean(formik.errors.name)}
                helperText={(formik.touched.name && formik.errors.name) || ' '}
                fullWidth
                required
              />
              <FormControl fullWidth disabled={isEdit}>
                <InputLabel>Type</InputLabel>
                <Select
                  label="Type"
                  name="type"
                  value={formik.values.type}
                  onChange={(e) => formik.setFieldValue('type', e.target.value as IntegrationProviderType)}
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

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
                label="Default for this type"
              />
              <FormControlLabel
                control={<Switch checked={formik.values.is_active} onChange={(e) => formik.setFieldValue('is_active', e.target.checked)} />}
                label="Active"
              />
            </Stack>

            <Typography variant="overline" color="text.secondary" sx={{ pt: 1 }}>
              {formik.values.type} CONFIG
            </Typography>
            {fields.map((field) => (
              <TextField
                key={field.name}
                label={field.label}
                name={`config.${field.name}`}
                type={field.secret ? 'password' : 'text'}
                value={formik.values.config[field.name] ?? ''}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={Boolean(configError(field.name))}
                helperText={configError(field.name) || (field.secret ? secretHelper(field.hasFlag) : ' ')}
                fullWidth
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between' }}>
          {isEdit && onTest ? (
            <Button startIcon={<ScienceIcon />} onClick={() => onTest(initial!)} disabled={testing}>
              {testing ? 'Testing…' : 'Test connection'}
            </Button>
          ) : (
            <span />
          )}
          <Stack direction="row" spacing={1}>
            <Button onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </Stack>
        </DialogActions>
      </form>
    </Dialog>
  );
}
