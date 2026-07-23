import { Box, Stack, TextField, Typography } from '@mui/material';
import DateField from '../../components/DateField';
import { getHostDobMaxDate, getHostDobMinDate } from '../../utils/hostDob';
import HostUploader from './HostUploader';
import type { HostStep1, HostStep2, HostStep3 } from './types';

interface Props {
  step: number;
  s1: HostStep1;
  s2: HostStep2;
  s3: HostStep3;
  set1: (next: HostStep1) => void;
  set2: (next: HostStep2) => void;
  set3: (next: HostStep3) => void;
  openPicker: (kind: 'photo' | 'police') => void;
}

export default function HostStepContent({ step, s1, s2, s3, set1, set2, set3, openPicker }: Readonly<Props>) {
  if (step === 0) {
    return (
      <Stack spacing={2}>
        <TextField label="Full name" required value={s1.full_name} onChange={(e) => set1({ ...s1, full_name: e.target.value })} />
        <TextField label="Email" type="email" required value={s1.email} disabled helperText="Locked to your Duncit account" InputProps={{ readOnly: true }} />
        <TextField label="Phone" required value={s1.phone} onChange={(e) => set1({ ...s1, phone: e.target.value })} />
        <DateField label="DOB" value={s1.dob} onChange={(iso) => set1({ ...s1, dob: iso })} minDate={getHostDobMinDate()} maxDate={getHostDobMaxDate()} />
      </Stack>
    );
  }
  if (step === 1) {
    return (
      <Stack spacing={2}>
        <TextField label="Aadhar number" required helperText="12-digit number" value={s2.aadhar_number} onChange={(e) => set2({ ...s2, aadhar_number: e.target.value })} />
        <TextField label="PAN number" required helperText="Format ABCDE1234F" value={s2.pan_number} onChange={(e) => set2({ ...s2, pan_number: e.target.value.toUpperCase() })} />
        {s2.passport_photo_url && <Box component="img" src={s2.passport_photo_url} sx={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 1, border: 1, borderColor: 'divider' }} />}
        <HostUploader label="Passport-size photo" value={s2.passport_photo_url} onPick={() => openPicker('photo')} />
      </Stack>
    );
  }
  if (step === 2) {
    return (
      <Stack spacing={2}>
        <HostUploader label="Police verification certificate" value={s3.police_verification_url} onPick={() => openPicker('police')} />
        <TextField label="Full address" required multiline minRows={3} value={s3.full_address} onChange={(e) => set3({ ...s3, full_address: e.target.value })} />
      </Stack>
    );
  }
  return (
    <Stack spacing={1}>
      <Typography variant="body1">Submit your application for review.</Typography>
      <Typography variant="caption" color="text.secondary">{s1.full_name} - {s1.email}</Typography>
    </Stack>
  );
}