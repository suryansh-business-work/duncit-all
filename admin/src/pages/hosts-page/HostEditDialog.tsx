import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Step, StepLabel, Stepper, TextField } from '@mui/material';
import { Form, Formik, getIn, type FormikErrors, type FormikTouched } from 'formik';
import MediaPickerField from '../../components/MediaPickerField';
import { STATUSES, UPDATE_HOST } from './queries';
import { hostEditInitialValues, hostEditSchema, toHostEditVariables, type HostEditValues } from '../../forms/host.form';

interface Props {
  host: any | null;
  onClose: () => void;
  onSaved: () => void;
}

const steps = ['Personal', 'Identity', 'Verification'];

const stepFields = [
  ['step1.full_name', 'step1.email', 'step1.phone', 'step1.dob'],
  ['step2.aadhar_number', 'step2.pan_number', 'step2.passport_photo_url'],
  ['step3.police_verification_url', 'step3.full_address', 'step3.tags', 'status'],
];

const showError = (
  values: HostEditValues,
  errors: FormikErrors<HostEditValues>,
  touched: FormikTouched<HostEditValues>,
  submitCount: number,
  name: string
) => {
  const value = getIn(values, name);
  const hasValue = Array.isArray(value) ? value.length > 0 : String(value ?? '').length > 0;
  return Boolean(getIn(errors, name) && (submitCount > 0 || getIn(touched, name) || hasValue));
};

export default function HostEditDialog({ host, onClose, onSaved }: Props) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [updateHost, state] = useMutation(UPDATE_HOST);

  useEffect(() => {
    if (!host) return;
    setStep(0);
    setError('');
  }, [host]);

  return (
    <Dialog open={!!host} onClose={state.loading ? undefined : onClose} fullWidth maxWidth="sm">
      <Formik<HostEditValues>
        initialValues={hostEditInitialValues(host)}
        enableReinitialize
        validationSchema={hostEditSchema}
        validateOnBlur
        validateOnChange
        onSubmit={async (values) => {
          if (!host) return;
          setError('');
          try {
            await updateHost({ variables: { id: host.id, ...toHostEditVariables(values) } });
            onSaved();
            onClose();
          } catch (err: any) {
            setError(err?.message || 'Failed to save host');
          }
        }}
      >
        {({ values, errors, touched, submitCount, handleBlur, handleChange, setFieldTouched, setFieldValue, submitForm }) => {
          const hasError = (name: string) => showError(values, errors, touched, submitCount, name);
          const props = (name: string) => ({
            name,
            value: getIn(values, name) ?? '',
            onChange: handleChange,
            onBlur: handleBlur,
            error: hasError(name),
            helperText: hasError(name) ? getIn(errors, name) : ' ',
            fullWidth: true,
            size: 'small' as const,
          });
          const next = () => {
            for (const field of stepFields[step]) setFieldTouched(field, true, false);
            setStep((value) => Math.min(steps.length - 1, value + 1));
          };
          return (
            <Form noValidate>
              <DialogTitle>Edit Host</DialogTitle>
              <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <Stepper activeStep={step} alternativeLabel>{steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}</Stepper>
                  {error && <Alert severity="error">{error}</Alert>}
                  {step === 0 && <Stack spacing={1.5}>
                    <TextField label="Full name" {...props('step1.full_name')} />
                    <TextField label="Email" type="email" {...props('step1.email')} />
                    <TextField label="Phone" {...props('step1.phone')} />
                    <TextField label="DOB" type="date" InputLabelProps={{ shrink: true }} {...props('step1.dob')} />
                  </Stack>}
                  {step === 1 && <Stack spacing={1.5}>
                    <TextField label="Aadhar number" {...props('step2.aadhar_number')} />
                    <TextField label="PAN number" {...props('step2.pan_number')} />
                    <MediaPickerField label="Passport photo" value={values.step2.passport_photo_url} onChange={(url) => setFieldValue('step2.passport_photo_url', url)} helperText={hasError('step2.passport_photo_url') ? getIn(errors, 'step2.passport_photo_url') : ' '} folder="/hosts/photo" />
                  </Stack>}
                  {step === 2 && <Stack spacing={1.5}>
                    <MediaPickerField label="Police verification" value={values.step3.police_verification_url} onChange={(url) => setFieldValue('step3.police_verification_url', url)} helperText={hasError('step3.police_verification_url') ? getIn(errors, 'step3.police_verification_url') : ' '} folder="/hosts/docs" />
                    <TextField label="Full address" multiline minRows={2} {...props('step3.full_address')} />
                    <TextField label="Tags" value={values.step3.tags.join(', ')} onChange={(event) => setFieldValue('step3.tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))} helperText="Comma separated host tags." fullWidth size="small" />
                    <TextField select label="Status" {...props('status')}>{STATUSES.filter(Boolean).map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField>
                  </Stack>}
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button type="button" onClick={onClose} disabled={state.loading}>Cancel</Button>
                <Button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Button>
                {step < steps.length - 1 ? <Button type="button" variant="contained" onClick={next}>Next</Button> : <Button type="button" variant="contained" onClick={submitForm} disabled={state.loading}>Save</Button>}
              </DialogActions>
            </Form>
          );
        }}
      </Formik>
    </Dialog>
  );
}