import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { Form, Formik } from 'formik';
import {
  INTERVIEW_STATUSES,
  interviewFormSchema,
  interviewInitialValues,
  type InterviewFormValues,
} from '../interview.form';
import InterviewRequestSummary from './InterviewRequestSummary';
import InterviewScheduleFields from './InterviewScheduleFields';
import { showInterviewError } from './interviewDialogHelpers';

interface Props {
  active: any | null;
  saving: boolean;
  error: string | null;
  fmtSlotLong: (slot: { start: string; end: string }) => string;
  onClose: () => void;
  onSubmit: (values: InterviewFormValues) => Promise<void> | void;
}

export default function ManageInterviewDialog({ active, saving, error, fmtSlotLong, onClose, onSubmit }: Readonly<Props>) {
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
          const showError = (key: keyof InterviewFormValues) =>
            showInterviewError(values, errors, touched, submitCount, key);
          const helperText = (key: keyof InterviewFormValues, fallback = ' ') =>
            showError(key) ? String(errors[key]) : fallback;
          const showSchedule = values.status === 'SCHEDULED' || values.status === 'APPROVED';

          return (
            <Form noValidate>
              <DialogTitle>Manage Interview Request</DialogTitle>
              <DialogContent>
                {active && (
                  <Stack spacing={2} sx={{ mt: 1 }}>
                    <InterviewRequestSummary
                      active={active}
                      values={values}
                      fmtSlotLong={fmtSlotLong}
                      setFieldValue={setFieldValue}
                    />
                    <TextField
                      select
                      label="Status"
                      name="status"
                      value={values.status}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={showError('status')}
                      helperText={helperText('status')}
                      fullWidth
                    >
                      {INTERVIEW_STATUSES.map((status) => (
                        <MenuItem key={status} value={status}>
                          {status.charAt(0) + status.slice(1).toLowerCase()}
                        </MenuItem>
                      ))}
                    </TextField>
                    {showSchedule && (
                      <InterviewScheduleFields
                        values={values}
                        showError={showError}
                        helperText={helperText}
                        setFieldValue={setFieldValue}
                      />
                    )}
                    <TextField
                      label="Meeting link (optional)"
                      name="meetingLink"
                      value={values.meetingLink}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={showError('meetingLink')}
                      helperText={helperText('meetingLink')}
                      fullWidth
                      placeholder="https://meet.google.com/..."
                    />
                    <TextField
                      label="Admin notes"
                      name="notes"
                      value={values.notes}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={showError('notes')}
                      helperText={helperText('notes')}
                      multiline
                      minRows={2}
                      fullWidth
                    />
                    {error && <Alert severity="error">{error}</Alert>}
                  </Stack>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={onClose} disabled={saving}>Cancel</Button>
                <Button variant="contained" onClick={submitForm} disabled={saving}>
                  {saving ? 'Saving...' : 'Save & Notify'}
                </Button>
              </DialogActions>
            </Form>
          );
        }}
      </Formik>
    </Dialog>
  );
}