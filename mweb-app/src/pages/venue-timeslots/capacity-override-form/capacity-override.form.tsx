import {
  Alert,
  Button,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { Form, Formik } from 'formik';
import DateField from '../../../components/DateField';
import {
  capacityOverrideInitialValues,
  capacityOverrideSchema,
  toOverrideInput,
} from './capacity-override.schema';
import type {
  CapacityOverrideFormValues,
  CapacityOverrideInput,
} from './capacity-override.types';

interface TemplateOption {
  id: string;
  label: string;
}

interface Props {
  templates: TemplateOption[];
  submitting?: boolean;
  errorMessage?: string | null;
  onSubmit: (input: CapacityOverrideInput) => Promise<void> | void;
  onCancel: () => void;
}

export default function CapacityOverrideForm({
  templates,
  submitting,
  errorMessage,
  onSubmit,
  onCancel,
}: Props) {
  return (
    <Formik<CapacityOverrideFormValues>
      initialValues={capacityOverrideInitialValues}
      validationSchema={capacityOverrideSchema}
      validateOnBlur
      validateOnChange
      onSubmit={async (values) => {
        await onSubmit(toOverrideInput(values));
      }}
    >
      {({ values, errors, touched, submitCount, handleBlur, handleChange, setFieldValue }) => {
        const showErr = (key: keyof CapacityOverrideFormValues) =>
          Boolean(errors[key] && (submitCount > 0 || touched[key] || String(values[key] ?? '').length > 0));
        const help = (key: keyof CapacityOverrideFormValues, fallback = ' ') =>
          showErr(key) ? (errors[key] as string) : fallback;
        return (
          <Form noValidate>
            <Stack spacing={2}>
              {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
              <TextField
                select
                label="Slot template"
                name="template_id"
                value={values.template_id}
                onChange={handleChange}
                onBlur={handleBlur}
                error={showErr('template_id')}
                helperText={help('template_id')}
                fullWidth
                required
              >
                <MenuItem value="">Select a slot…</MenuItem>
                {templates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.label}
                  </MenuItem>
                ))}
              </TextField>
              <DateField
                label="Occurrence date"
                value={values.occurrence_date}
                onChange={(iso) => setFieldValue('occurrence_date', iso)}
                error={showErr('occurrence_date')}
                helperText={help('occurrence_date')}
                required
              />
              <TextField
                type="number"
                label="Capacity override"
                name="capacity_override"
                value={values.capacity_override}
                onChange={handleChange}
                onBlur={handleBlur}
                error={showErr('capacity_override')}
                helperText={help('capacity_override', 'Leave blank to keep the template default.')}
                inputProps={{ min: 0, step: 1 }}
                fullWidth
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={values.is_cancelled}
                    onChange={(_event, checked) => setFieldValue('is_cancelled', checked)}
                  />
                }
                label="Cancel this occurrence"
              />
              <TextField
                label="Note"
                name="note"
                value={values.note}
                onChange={handleChange}
                onBlur={handleBlur}
                error={showErr('note')}
                helperText={help('note', 'Visible internally; explain the change.')}
                multiline
                minRows={2}
                fullWidth
              />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button onClick={onCancel} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={14} /> : undefined}
                >
                  {submitting ? 'Saving…' : 'Save override'}
                </Button>
              </Stack>
            </Stack>
          </Form>
        );
      }}
    </Formik>
  );
}
