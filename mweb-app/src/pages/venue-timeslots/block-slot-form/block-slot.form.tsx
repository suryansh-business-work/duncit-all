import {
  Alert,
  Button,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { Form, Formik } from 'formik';
import {
  blockSlotInitialValues,
  blockSlotSchema,
  toBlockInput,
} from './block-slot.schema';
import type { BlockSlotFormValues, BlockVenueTimeslotInput } from './block-slot.types';

interface TemplateOption {
  id: string;
  label: string;
}

interface Props {
  templates: TemplateOption[];
  submitting?: boolean;
  errorMessage?: string | null;
  onSubmit: (input: BlockVenueTimeslotInput) => Promise<void> | void;
  onCancel: () => void;
}

const parseISO = (value: string): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export default function BlockSlotForm({
  templates,
  submitting,
  errorMessage,
  onSubmit,
  onCancel,
}: Props) {
  return (
    <Formik<BlockSlotFormValues>
      initialValues={blockSlotInitialValues}
      validationSchema={blockSlotSchema}
      validateOnBlur
      validateOnChange
      onSubmit={async (values) => {
        await onSubmit(toBlockInput(values));
      }}
    >
      {({ values, errors, touched, submitCount, handleBlur, handleChange, setFieldValue }) => {
        const showErr = (key: keyof BlockSlotFormValues) =>
          Boolean(errors[key] && (submitCount > 0 || touched[key] || !!values[key]));
        const help = (key: keyof BlockSlotFormValues, fallback = ' ') =>
          showErr(key) ? (errors[key] as string) : fallback;
        return (
          <Form noValidate>
            <Stack spacing={2}>
              {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
              <TextField
                select
                label="Slot to block"
                name="template_id"
                value={values.template_id}
                onChange={handleChange}
                helperText="Leave blank to block ALL slots in this venue."
                fullWidth
              >
                <MenuItem value="">All slots</MenuItem>
                {templates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.label}
                  </MenuItem>
                ))}
              </TextField>
              <DateTimePicker
                label="From"
                value={parseISO(values.from)}
                onChange={(value) => setFieldValue('from', value ? value.toISOString() : '')}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: showErr('from'),
                    helperText: help('from'),
                  },
                }}
              />
              <DateTimePicker
                label="To"
                value={parseISO(values.to)}
                onChange={(value) => setFieldValue('to', value ? value.toISOString() : '')}
                minDateTime={parseISO(values.from) ?? undefined}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: showErr('to'),
                    helperText: help('to'),
                  },
                }}
              />
              <TextField
                label="Reason"
                name="reason"
                value={values.reason}
                onChange={handleChange}
                onBlur={handleBlur}
                error={showErr('reason')}
                helperText={help('reason')}
                multiline
                minRows={2}
                fullWidth
                required
              />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button onClick={onCancel} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="error"
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={14} /> : undefined}
                >
                  {submitting ? 'Blocking…' : 'Block'}
                </Button>
              </Stack>
            </Stack>
          </Form>
        );
      }}
    </Formik>
  );
}
