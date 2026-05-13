import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Form, Formik, type FormikErrors, type FormikTouched } from 'formik';
import DateTimeField from '../../components/DateTimeField';
import {
  INTERVIEW_STATUSES,
  interviewFormSchema,
  interviewInitialValues,
  type InterviewFormValues,
} from './interview.form';

interface Props {
  active: any | null;
  saving: boolean;
  error: string | null;
  fmtSlotLong: (s: { start: string; end: string }) => string;
  onClose: () => void;
  onSubmit: (values: InterviewFormValues) => Promise<void> | void;
}

function showError(
  values: InterviewFormValues,
  errors: FormikErrors<InterviewFormValues>,
  touched: FormikTouched<InterviewFormValues>,
  submitCount: number,
  key: keyof InterviewFormValues,
) {
  const value = values[key];
  const hasValue =
    typeof value === 'number' ? value !== 0 : String(value ?? '').length > 0;
  return Boolean(errors[key] && (submitCount > 0 || touched[key] || hasValue));
}

export default function ManageInterviewDialog({
  active,
  saving,
  error,
  fmtSlotLong,
  onClose,
  onSubmit,
}: Props) {
  return (
    <Dialog open={!!active} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <Formik<InterviewFormValues>
        initialValues={interviewInitialValues(active)}
        enableReinitialize
        validationSchema={interviewFormSchema}
        validateOnBlur
        validateOnChange
        onSubmit={async (values) => {
          await onSubmit(values);
        }}
      >
        {({ values, errors, touched, submitCount, handleBlur, handleChange, setFieldValue, submitForm }) => {
          const err = (key: keyof InterviewFormValues) =>
            showError(values, errors, touched, submitCount, key);
          const help = (key: keyof InterviewFormValues, fallback = ' ') =>
            err(key) ? String(errors[key]) : fallback;
          const showSchedule = values.status === 'SCHEDULED' || values.status === 'APPROVED';

          return (
            <Form noValidate>
              <DialogTitle>Manage Interview Request</DialogTitle>
              <DialogContent>
                {active && (
                  <Stack spacing={2} sx={{ mt: 1 }}>
                    <Box>
                      <Typography variant="subtitle2">
                        {active.applicant_name} · {active.type}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {active.applicant_email} · {active.applicant_phone}
                      </Typography>
                    </Box>
                    {active.business_name && (
                      <Typography variant="body2">
                        <strong>Business:</strong> {active.business_name}
                        {active.business_address ? ` — ${active.business_address}` : ''}
                      </Typography>
                    )}
                    {(active.city || active.zone) && (
                      <Typography variant="body2">
                        <strong>Location:</strong>{' '}
                        {[active.city, active.zone].filter(Boolean).join(' / ')}
                      </Typography>
                    )}
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        About
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {active.about}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Preferred slots
                      </Typography>
                      <Stack spacing={0.5}>
                        {active.preferred_slots.map((s: any, i: number) => (
                          <Chip
                            key={i}
                            label={fmtSlotLong(s)}
                            variant={values.pickedSlotIdx === i ? 'filled' : 'outlined'}
                            color={values.pickedSlotIdx === i ? 'primary' : 'default'}
                            onClick={() => {
                              setFieldValue('pickedSlotIdx', i);
                              setFieldValue('customStart', s.start);
                              setFieldValue('customEnd', s.end);
                            }}
                            sx={{ justifyContent: 'flex-start' }}
                          />
                        ))}
                      </Stack>
                    </Box>

                    <TextField
                      select
                      label="Status"
                      name="status"
                      value={values.status}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={err('status')}
                      helperText={help('status')}
                      fullWidth
                    >
                      {INTERVIEW_STATUSES.map((status) => (
                        <MenuItem key={status} value={status}>
                          {status.charAt(0) + status.slice(1).toLowerCase()}
                        </MenuItem>
                      ))}
                    </TextField>

                    {showSchedule && (
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Stack flex={1}>
                          <DateTimeField
                            label="Start"
                            value={values.customStart}
                            onChange={(iso) => setFieldValue('customStart', iso)}
                          />
                          {err('customStart') && (
                            <Typography variant="caption" color="error">
                              {help('customStart')}
                            </Typography>
                          )}
                        </Stack>
                        <Stack flex={1}>
                          <DateTimeField
                            label="End"
                            value={values.customEnd}
                            onChange={(iso) => setFieldValue('customEnd', iso)}
                            minDateTime={values.customStart ? new Date(values.customStart) : null}
                          />
                          {err('customEnd') && (
                            <Typography variant="caption" color="error">
                              {help('customEnd')}
                            </Typography>
                          )}
                        </Stack>
                      </Stack>
                    )}

                    <TextField
                      label="Meeting link (optional)"
                      name="meetingLink"
                      value={values.meetingLink}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={err('meetingLink')}
                      helperText={help('meetingLink')}
                      fullWidth
                      placeholder="https://meet.google.com/..."
                    />
                    <TextField
                      label="Admin notes"
                      name="notes"
                      value={values.notes}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={err('notes')}
                      helperText={help('notes')}
                      multiline
                      minRows={2}
                      fullWidth
                    />

                    {error && <Alert severity="error">{error}</Alert>}
                  </Stack>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="contained" onClick={submitForm} disabled={saving}>
                  {saving ? 'Saving…' : 'Save & Notify'}
                </Button>
              </DialogActions>
            </Form>
          );
        }}
      </Formik>
    </Dialog>
  );
}
