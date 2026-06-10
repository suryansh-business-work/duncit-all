import * as yup from 'yup';
import { Form, Formik } from 'formik';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import type { PaymentReleaseReviewFormProps, PaymentReleaseReviewValues } from './payment-release-review.types';

export const paymentReleaseReviewSchema = (requestedAmount: number): yup.ObjectSchema<PaymentReleaseReviewValues> => yup.object({
  status: yup.mixed<'APPROVED' | 'REJECTED'>().oneOf(['APPROVED', 'REJECTED']).required('Status is required'),
  approval_type: yup.mixed<'FULL' | 'PARTIAL'>().oneOf(['FULL', 'PARTIAL']).required('Release type is required'),
  approved_amount: yup.number().typeError('Enter amount').min(0).max(requestedAmount, 'Cannot exceed requested amount').required('Approved amount is required'),
  approval_reason: yup.string().trim().max(1000).default('').when(['status', 'approval_type'], {
    is: (status: string, type: string) => status === 'REJECTED' || type === 'PARTIAL',
    then: (schema) => schema.required('Reason is required'),
  }),
});

export function toReviewInput(values: PaymentReleaseReviewValues, requestedAmount: number) {
  const approved = values.status === 'APPROVED';
  return {
    status: values.status,
    approval_type: approved ? values.approval_type : undefined,
    approved_amount: approved && values.approval_type === 'FULL' ? requestedAmount : Number(values.approved_amount),
    approval_reason: values.approval_reason || undefined,
  };
}

export default function PaymentReleaseReviewForm({ request, busy, errorMessage, onClose, onSubmit }: Readonly<PaymentReleaseReviewFormProps>) {
  const requestedAmount = Number(request?.amount_requested || 0);
  return (
    <Dialog open={!!request} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Review Payment Release</DialogTitle>
      <Formik<PaymentReleaseReviewValues>
        initialValues={{ status: 'APPROVED', approval_type: 'FULL', approved_amount: requestedAmount, approval_reason: '' }}
        enableReinitialize
        validationSchema={paymentReleaseReviewSchema(requestedAmount)}
        onSubmit={(values) => onSubmit(values)}
      >
        {({ values, errors, touched, handleChange, handleBlur, setFieldValue }) => {
          const show = (key: keyof PaymentReleaseReviewValues) => Boolean(errors[key] && touched[key]);
          return (
            <Form noValidate>
              <DialogContent dividers>
                <Stack spacing={2}>
                  {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
                  <TextField select name="status" label="Decision" value={values.status} onChange={handleChange} fullWidth>
                    <MenuItem value="APPROVED">Approve</MenuItem>
                    <MenuItem value="REJECTED">Reject</MenuItem>
                  </TextField>
                  <TextField select name="approval_type" label="Release type" value={values.approval_type} onChange={(event) => { handleChange(event); if (event.target.value === 'FULL') setFieldValue('approved_amount', requestedAmount); }} disabled={values.status === 'REJECTED'} fullWidth>
                    <MenuItem value="FULL">Full Release</MenuItem>
                    <MenuItem value="PARTIAL">Partial Release</MenuItem>
                  </TextField>
                  <TextField name="approved_amount" label="Approved amount" type="number" value={values.approved_amount} onChange={handleChange} onBlur={handleBlur} disabled={values.status === 'REJECTED' || values.approval_type === 'FULL'} error={show('approved_amount')} helperText={show('approved_amount') ? errors.approved_amount : `Requested Rs ${requestedAmount.toFixed(2)}`} fullWidth />
                  <TextField name="approval_reason" label="Reason" value={values.approval_reason} onChange={handleChange} onBlur={handleBlur} error={show('approval_reason')} helperText={show('approval_reason') ? errors.approval_reason : 'Required for partial release or rejection'} multiline minRows={3} fullWidth />
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={onClose} disabled={busy}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Saving...' : 'Submit Review'}</Button>
              </DialogActions>
            </Form>
          );
        }}
      </Formik>
    </Dialog>
  );
}