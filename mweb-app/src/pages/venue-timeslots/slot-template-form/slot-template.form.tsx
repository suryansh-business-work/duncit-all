import {
  Alert,
  Button,
  CircularProgress,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { Form, Formik } from 'formik';
import DateField from '../../../components/DateField';
import WeeklyRecurrencePicker from '../components/WeeklyRecurrencePicker';
import MonthlyRecurrencePicker from '../components/MonthlyRecurrencePicker';
import SpecificDatesPicker from '../components/SpecificDatesPicker';
import {
  DURATION_PRESETS,
  RECURRENCE_KINDS,
  slotTemplateInitialValues,
  slotTemplateSchema,
  templateToFormValues,
  toTemplateInput,
} from './slot-template.schema';
import type {
  SlotTemplateFormValues,
  VenueTimeslotTemplateInput,
} from './slot-template.types';

interface Props {
  initial?: Partial<SlotTemplateFormValues> | null;
  submitting?: boolean;
  errorMessage?: string | null;
  onSubmit: (input: VenueTimeslotTemplateInput) => Promise<void> | void;
  onCancel: () => void;
}

const parseHHMMToDate = (value: string): Date | null => {
  if (!value) return null;
  const [hh, mm] = value.split(':').map((p) => parseInt(p, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
};

const formatHHMM = (date: Date | null): string => {
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export default function SlotTemplateForm({
  initial,
  submitting,
  errorMessage,
  onSubmit,
  onCancel,
}: Props) {
  const initialValues = templateToFormValues(initial as any);

  return (
    <Formik<SlotTemplateFormValues>
      initialValues={initialValues}
      enableReinitialize
      validationSchema={slotTemplateSchema}
      validateOnBlur
      validateOnChange
      onSubmit={async (values) => {
        await onSubmit(toTemplateInput(values));
      }}
    >
      {({ values, errors, touched, submitCount, handleBlur, handleChange, setFieldValue }) => {
        const showErr = (key: keyof SlotTemplateFormValues) =>
          Boolean(errors[key] && (submitCount > 0 || touched[key] || String(values[key] ?? '').length > 0));
        const help = (key: keyof SlotTemplateFormValues, fallback = ' ') =>
          showErr(key) ? (errors[key] as string) : fallback;
        return (
          <Form noValidate>
            <Stack spacing={2}>
              {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
              <TextField
                label="Label (optional)"
                name="label"
                value={values.label}
                onChange={handleChange}
                onBlur={handleBlur}
                error={showErr('label')}
                helperText={help('label', 'e.g. Morning yoga, Evening turf')}
                fullWidth
              />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Duration"
                    name="duration_minutes"
                    value={values.duration_minutes}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={showErr('duration_minutes')}
                    helperText={help('duration_minutes')}
                    fullWidth
                  >
                    {DURATION_PRESETS.map((minutes) => (
                      <MenuItem key={minutes} value={minutes}>
                        {minutes} min
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    type="number"
                    label="Capacity (people)"
                    name="capacity"
                    value={values.capacity}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={showErr('capacity')}
                    helperText={help('capacity')}
                    inputProps={{ min: 1, step: 1 }}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={6}>
                  <TimePicker
                    label="Start time"
                    value={parseHHMMToDate(values.start_time)}
                    onChange={(value) => setFieldValue('start_time', formatHHMM(value))}
                    slotProps={{ textField: { fullWidth: true, error: showErr('start_time'), helperText: help('start_time') } }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TimePicker
                    label="End time"
                    value={parseHHMMToDate(values.end_time)}
                    onChange={(value) => setFieldValue('end_time', formatHHMM(value))}
                    slotProps={{ textField: { fullWidth: true, error: showErr('end_time'), helperText: help('end_time') } }}
                  />
                </Grid>
              </Grid>
              <TextField
                select
                label="Recurrence"
                name="recurrence_kind"
                value={values.recurrence_kind}
                onChange={handleChange}
                fullWidth
              >
                {RECURRENCE_KINDS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
              {values.recurrence_kind === 'WEEKLY' && <WeeklyRecurrencePicker />}
              {values.recurrence_kind === 'MONTHLY' && <MonthlyRecurrencePicker />}
              {values.recurrence_kind === 'SPECIFIC_DATES' && <SpecificDatesPicker />}
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <DateField
                    label="Valid from"
                    value={values.valid_from}
                    onChange={(iso) => setFieldValue('valid_from', iso)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <DateField
                    label="Valid until"
                    value={values.valid_until}
                    onChange={(iso) => setFieldValue('valid_until', iso)}
                    minDate={values.valid_from ? new Date(values.valid_from) : undefined}
                  />
                </Grid>
              </Grid>
              <FormControlLabel
                control={
                  <Switch
                    checked={values.is_active}
                    onChange={(_event, checked) => setFieldValue('is_active', checked)}
                  />
                }
                label={values.is_active ? 'Active' : 'Paused'}
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
                  {submitting ? 'Saving…' : 'Save slot'}
                </Button>
              </Stack>
            </Stack>
          </Form>
        );
      }}
    </Formik>
  );
}

export { slotTemplateInitialValues };
