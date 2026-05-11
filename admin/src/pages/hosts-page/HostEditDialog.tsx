import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Step, StepLabel, Stepper, TextField } from '@mui/material';
import * as yup from 'yup';
import MediaPickerField from '../../components/MediaPickerField';
import { STATUSES, UPDATE_HOST } from './queries';

interface Props {
  host: any | null;
  onClose: () => void;
  onSaved: () => void;
}

const steps = ['Personal', 'Identity', 'Verification'];

const schema = yup.object({
  step1: yup.object({
    full_name: yup.string().trim().required('Full name required'),
    email: yup.string().email().required('Email required'),
    phone: yup.string().trim().required('Phone required'),
    dob: yup.string().default(''),
  }),
  step2: yup.object({
    aadhar_number: yup.string().trim().required('Aadhar required'),
    pan_number: yup.string().trim().required('PAN required'),
    passport_photo_url: yup.string().trim().required('Passport photo required'),
  }),
  step3: yup.object({
    police_verification_url: yup.string().trim().required('Police verification required'),
    full_address: yup.string().trim().required('Address required'),
    tags: yup.array(yup.string().trim()).default([]),
  }),
});

const dateOnly = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : '';

export default function HostEditDialog({ host, onClose, onSaved }: Props) {
  const [step, setStep] = useState(0);
  const [s1, setS1] = useState({ full_name: '', email: '', phone: '', dob: '' });
  const [s2, setS2] = useState({ aadhar_number: '', pan_number: '', passport_photo_url: '' });
  const [s3, setS3] = useState({ police_verification_url: '', full_address: '', tags: [] as string[] });
  const [status, setStatus] = useState('APPROVED');
  const [error, setError] = useState('');
  const [updateHost, state] = useMutation(UPDATE_HOST);

  useEffect(() => {
    if (!host) return;
    setStep(0);
    setS1({ full_name: host.full_name ?? '', email: host.email ?? '', phone: host.phone ?? '', dob: dateOnly(host.dob) });
    setS2({ aadhar_number: host.aadhar_number ?? '', pan_number: host.pan_number ?? '', passport_photo_url: host.passport_photo_url ?? '' });
    setS3({ police_verification_url: host.police_verification_url ?? '', full_address: host.full_address ?? '', tags: host.tags ?? [] });
    setStatus(host.status ?? 'APPROVED');
    setError('');
  }, [host]);

  const save = async () => {
    if (!host) return;
    const payload = { step1: s1, step2: s2, step3: s3 };
    try {
      await schema.validate(payload, { abortEarly: false });
      await updateHost({ variables: { id: host.id, ...payload, status } });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.errors?.[0] || err.message || 'Failed');
    }
  };

  return (
    <Dialog open={!!host} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Host</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stepper activeStep={step} alternativeLabel>{steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}</Stepper>
          {error && <Alert severity="error">{error}</Alert>}
          {step === 0 && <Stack spacing={1.5}>
            <TextField label="Full name" value={s1.full_name} onChange={(e) => setS1({ ...s1, full_name: e.target.value })} />
            <TextField label="Email" value={s1.email} onChange={(e) => setS1({ ...s1, email: e.target.value })} />
            <TextField label="Phone" value={s1.phone} onChange={(e) => setS1({ ...s1, phone: e.target.value })} />
            <TextField label="DOB" type="date" InputLabelProps={{ shrink: true }} value={s1.dob} onChange={(e) => setS1({ ...s1, dob: e.target.value })} />
          </Stack>}
          {step === 1 && <Stack spacing={1.5}>
            <TextField label="Aadhar number" value={s2.aadhar_number} onChange={(e) => setS2({ ...s2, aadhar_number: e.target.value })} />
            <TextField label="PAN number" value={s2.pan_number} onChange={(e) => setS2({ ...s2, pan_number: e.target.value })} />
            <MediaPickerField label="Passport photo" value={s2.passport_photo_url} onChange={(url) => setS2({ ...s2, passport_photo_url: url })} folder="/hosts/photo" />
          </Stack>}
          {step === 2 && <Stack spacing={1.5}>
            <MediaPickerField label="Police verification" value={s3.police_verification_url} onChange={(url) => setS3({ ...s3, police_verification_url: url })} folder="/hosts/docs" />
            <TextField label="Full address" multiline minRows={2} value={s3.full_address} onChange={(e) => setS3({ ...s3, full_address: e.target.value })} />
            <TextField label="Tags" value={s3.tags.join(', ')} onChange={(e) => setS3({ ...s3, tags: e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} />
            <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.filter(Boolean).map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField>
          </Stack>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Button>
        {step < steps.length - 1 ? <Button variant="contained" onClick={() => setStep(step + 1)}>Next</Button> : <Button variant="contained" onClick={save} disabled={state.loading}>Save</Button>}
      </DialogActions>
    </Dialog>
  );
}