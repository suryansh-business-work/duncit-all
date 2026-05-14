import * as yup from 'yup';
import { Form, Formik } from 'formik';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MediaPickerField from '../../../components/MediaPickerField';
import MediaListField from '../../../components/MediaListField';
import type { CompletePodDialogProps, HostReleaseValues, VenueReleaseValues } from './complete-pod.types';

const amountRule = yup
  .number()
  .typeError('Enter a valid amount')
  .moreThan(0, 'Amount must be greater than 0')
  .max(10000000, 'Amount is too high')
  .required('Amount is required');

export const venueReleaseSchema: yup.ObjectSchema<VenueReleaseValues> = yup.object({
  amount_requested: amountRule,
  bill_url: yup.string().trim().url('Upload or paste a valid bill URL').required('Bill upload is required'),
  notes: yup.string().trim().max(1000, 'Notes must be 1000 characters or fewer').default(''),
});

export const hostReleaseSchema: yup.ObjectSchema<HostReleaseValues> = yup.object({
  host_user_id: yup.string().trim().required('Select host'),
  amount_requested: amountRule,
  evidence_media_text: yup
    .string()
    .trim()
    .test('media-required', 'Upload at least one party photo or video', (value) => Boolean(value?.trim()))
    .required('Party media is required'),
  notes: yup.string().trim().max(1000, 'Notes must be 1000 characters or fewer').default(''),
});

export const mediaTextToInput = (value: string) =>
  value
    .split('\n')
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => ({ url, type: /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url) ? 'VIDEO' : 'IMAGE' }));

const fieldError = <T extends Record<string, any>>(errors: any, touched: any, key: keyof T) => ({
  error: Boolean(errors[key] && touched[key]),
  helperText: touched[key] && errors[key] ? String(errors[key]) : ' ',
});

export default function CompletePodDialog({
  open,
  pod,
  users,
  busyKind,
  errorMessage,
  onClose,
  onVenueSubmit,
  onHostSubmit,
}: CompletePodDialogProps) {
  const hostIds = (pod?.pod_hosts_id ?? []) as string[];
  const hostOptions = hostIds.map((id) => users.find((user) => user.user_id === id) ?? { user_id: id, full_name: id });
  const venueAmount = (pod?.place_charges ?? []).reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
  const hostAmount = Number(pod?.pod_amount) || 0;

  return (
    <Dialog open={open} onClose={busyKind ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>Complete this pod</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2">{pod?.pod_title}</Typography>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          <Accordion defaultExpanded disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={700}>This pod is completed</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Formik<VenueReleaseValues>
                initialValues={{ amount_requested: venueAmount || hostAmount || 1, bill_url: '', notes: '' }}
                validationSchema={venueReleaseSchema}
                onSubmit={(values) => onVenueSubmit(values)}
              >
                {({ values, errors, touched, handleChange, handleBlur, setFieldValue }) => (
                  <Form noValidate>
                    <Stack spacing={1.5}>
                      <TextField label="Release amount request" name="amount_requested" type="number" value={values.amount_requested} onChange={handleChange} onBlur={handleBlur} {...fieldError<VenueReleaseValues>(errors, touched, 'amount_requested')} fullWidth />
                      <MediaPickerField label="Bill upload" value={values.bill_url} onChange={(url) => setFieldValue('bill_url', url)} folder="/pod-bills" helperText={fieldError<VenueReleaseValues>(errors, touched, 'bill_url').helperText} />
                      <TextField label="Venue billing notes" name="notes" value={values.notes} onChange={handleChange} onBlur={handleBlur} multiline minRows={2} fullWidth />
                      <Button type="submit" variant="contained" disabled={busyKind === 'VENUE_BILLING'}>Initiate Venue Billing</Button>
                    </Stack>
                  </Form>
                )}
              </Formik>
            </AccordionDetails>
          </Accordion>
          <Accordion disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={700}>Release Host Payment</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Formik<HostReleaseValues>
                initialValues={{ host_user_id: hostOptions[0]?.user_id ?? '', amount_requested: hostAmount || 1, evidence_media_text: '', notes: '' }}
                validationSchema={hostReleaseSchema}
                onSubmit={(values) => onHostSubmit(values)}
              >
                {({ values, errors, touched, handleChange, handleBlur, setFieldValue }) => (
                  <Form noValidate>
                    <Stack spacing={1.5}>
                      <TextField select label="Host" name="host_user_id" value={values.host_user_id} onChange={handleChange} onBlur={handleBlur} {...fieldError<HostReleaseValues>(errors, touched, 'host_user_id')} fullWidth>
                        {hostOptions.map((host) => <MenuItem key={host.user_id} value={host.user_id}>{host.full_name || host.email || host.user_id}</MenuItem>)}
                      </TextField>
                      <TextField label="Release amount request" name="amount_requested" type="number" value={values.amount_requested} onChange={handleChange} onBlur={handleBlur} {...fieldError<HostReleaseValues>(errors, touched, 'amount_requested')} fullWidth />
                      <MediaListField label="Party photos & videos" buttonLabel="Add media" value={values.evidence_media_text} onChange={(next) => setFieldValue('evidence_media_text', next)} folder="/pod-completion" helperText={fieldError<HostReleaseValues>(errors, touched, 'evidence_media_text').helperText} />
                      <TextField label="Host payment notes" name="notes" value={values.notes} onChange={handleChange} onBlur={handleBlur} multiline minRows={2} fullWidth />
                      <Button type="submit" variant="contained" disabled={busyKind === 'HOST_PAYMENT'}>Request to Release Payment</Button>
                    </Stack>
                  </Form>
                )}
              </Formik>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={Boolean(busyKind)}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}