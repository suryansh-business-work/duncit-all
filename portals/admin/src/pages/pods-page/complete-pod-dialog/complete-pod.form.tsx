import * as yup from 'yup';
import { Form, Formik } from 'formik';
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
  Typography,
} from '@mui/material';
import MediaPickerField from '../../../components/MediaPickerField';
import MediaListField from '../../../components/MediaListField';
import SettlementPreview from './SettlementPreview';
import type { CompletePodDialogProps, CompletePodValues } from './complete-pod.types';

export const mediaTextToInput = (value: string) =>
  value
    .split('\n')
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => ({ url, type: /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url) ? 'VIDEO' : 'IMAGE' }));

/** Schema depends on whether the pod has a venue: only then is a bill required. */
export const buildCompleteSchema = (hasVenue: boolean): yup.ObjectSchema<CompletePodValues> =>
  yup.object({
    host_user_id: yup.string().trim().required('Select host'),
    venue_bill_amount: hasVenue
      ? yup.number().typeError('Enter a valid amount').moreThan(0, 'Venue bill must be greater than 0').required('Venue bill is required')
      : yup.number().typeError('Enter a valid amount').min(0).default(0),
    bill_url: hasVenue
      ? yup.string().trim().url('Upload or paste a valid bill URL').required('Bill upload is required')
      : yup.string().trim().default(''),
    media_text: yup
      .string()
      .trim()
      .test('media-required', 'Upload at least one party photo or video', (value) => Boolean(value?.trim()))
      .required('Party media is required'),
    notes: yup.string().trim().max(1000, 'Notes must be 1000 characters or fewer').default(''),
  });

/** Maps validated values onto the server's CompletePodInput. */
export function buildCompleteInput(values: CompletePodValues, podId: string) {
  return {
    pod_id: podId,
    host_user_id: values.host_user_id || undefined,
    venue_bill_amount: Number(values.venue_bill_amount) || 0,
    bill_url: values.bill_url.trim() || undefined,
    evidence_media: mediaTextToInput(values.media_text),
    notes: values.notes.trim() || undefined,
  };
}

const fieldError = (errors: any, touched: any, key: keyof CompletePodValues) => ({
  error: Boolean(errors[key] && touched[key]),
  helperText: touched[key] && errors[key] ? String(errors[key]) : ' ',
});

export default function CompletePodDialog({
  open,
  pod,
  users,
  busy,
  errorMessage,
  onClose,
  onSubmit,
}: Readonly<CompletePodDialogProps>) {
  const hasVenue = !!pod?.venue_id;
  const hostIds = (pod?.pod_hosts_id ?? []) as string[];
  const hostOptions = hostIds.map((id) => users.find((user) => user.user_id === id) ?? { user_id: id, full_name: id });
  const initialValues: CompletePodValues = {
    host_user_id: hostOptions[0]?.user_id ?? '',
    venue_bill_amount: 0,
    bill_url: '',
    media_text: '',
    notes: '',
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Complete this pod</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1}>
          <Typography variant="subtitle2">{pod?.pod_title}</Typography>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          <Formik<CompletePodValues>
            initialValues={initialValues}
            enableReinitialize
            validationSchema={buildCompleteSchema(hasVenue)}
            onSubmit={(values) => onSubmit(values)}
          >
            {({ values, errors, touched, handleChange, handleBlur, setFieldValue }) => (
              <Form noValidate>
                <Stack spacing={1.5}>
                  <TextField select label="Host" name="host_user_id" value={values.host_user_id} onChange={handleChange} onBlur={handleBlur} {...fieldError(errors, touched, 'host_user_id')} fullWidth>
                    {hostOptions.map((host) => (
                      <MenuItem key={host.user_id} value={host.user_id}>
                        {host.full_name || host.email || host.user_id}
                      </MenuItem>
                    ))}
                  </TextField>
                  {hasVenue && (
                    <>
                      <TextField label="Venue bill amount" name="venue_bill_amount" type="number" value={values.venue_bill_amount} onChange={handleChange} onBlur={handleBlur} {...fieldError(errors, touched, 'venue_bill_amount')} fullWidth />
                      <MediaPickerField label="Venue bill upload" value={values.bill_url} onChange={(url) => setFieldValue('bill_url', url)} folder="/pod-bills" helperText={fieldError(errors, touched, 'bill_url').helperText} />
                    </>
                  )}
                  <MediaListField label="Party photos & videos" buttonLabel="Add media" value={values.media_text} onChange={(next) => setFieldValue('media_text', next)} folder="/pod-completion" helperText={fieldError(errors, touched, 'media_text').helperText} />
                  {pod && <SettlementPreview podId={pod.id} venueBillAmount={Number(values.venue_bill_amount) || 0} />}
                  <TextField label="Notes" name="notes" value={values.notes} onChange={handleChange} onBlur={handleBlur} multiline minRows={2} fullWidth />
                  <Button type="submit" variant="contained" disabled={busy}>
                    {busy ? 'Submitting…' : 'Submit for approval'}
                  </Button>
                </Stack>
              </Form>
            )}
          </Formik>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
