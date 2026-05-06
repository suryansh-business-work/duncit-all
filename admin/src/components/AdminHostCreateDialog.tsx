import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import MediaPickerField from './MediaPickerField';

const USERS = gql`
  query UsersForHostCreate {
    users {
      user_id
      full_name
      email
      phone_number
    }
  }
`;

const ADMIN_CREATE_HOST = gql`
  mutation AdminCreateHost(
    $target_user_id: ID!
    $step1: HostStep1Input!
    $step2: HostStep2Input!
    $step3: HostStep3Input!
    $submit: Boolean
  ) {
    adminCreateHost(
      target_user_id: $target_user_id
      step1: $step1
      step2: $step2
      step3: $step3
      submit: $submit
    ) {
      id
      status
    }
  }
`;

export default function AdminHostCreateDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: usersData } = useQuery(USERS, { skip: !open });
  const [target, setTarget] = useState<any | null>(null);
  const [s1, setS1] = useState({ full_name: '', email: '', phone: '', dob: '' });
  const [s2, setS2] = useState({ aadhar_number: '', pan_number: '', passport_photo_url: '' });
  const [s3, setS3] = useState({ police_verification_url: '', full_address: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [submit] = useMutation(ADMIN_CREATE_HOST);

  const close = () => {
    setTarget(null);
    setS1({ full_name: '', email: '', phone: '', dob: '' });
    setS2({ aadhar_number: '', pan_number: '', passport_photo_url: '' });
    setS3({ police_verification_url: '', full_address: '' });
    setError('');
    onClose();
  };

  const save = async (asDraft: boolean) => {
    setError('');
    if (!target) return setError('Select a user');
    if (!s1.full_name || !s1.email || !s1.phone) return setError('Fill personal details');
    if (!s2.aadhar_number || !s2.pan_number || !s2.passport_photo_url)
      return setError('Fill identity & upload passport photo');
    if (!s3.police_verification_url || !s3.full_address)
      return setError('Upload police verification & enter address');
    setBusy(true);
    try {
      await submit({
        variables: {
          target_user_id: target.user_id,
          step1: s1,
          step2: s2,
          step3: s3,
          submit: !asDraft,
        },
      });
      onSaved();
      close();
    } catch (e: any) {
      setError(e.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>Create Host (on behalf)</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Typography color="error">{error}</Typography>}
          <Autocomplete
            options={usersData?.users ?? []}
            getOptionLabel={(o: any) => `${o.full_name} · ${o.email || o.phone_number || ''}`}
            value={target}
            onChange={(_, v) => setTarget(v)}
            renderInput={(params) => <TextField {...params} label="User *" size="small" />}
          />
          <Typography variant="subtitle2">Personal</Typography>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField label="Full name *" size="small" value={s1.full_name} onChange={(e) => setS1({ ...s1, full_name: e.target.value })} />
            <TextField label="Email *" size="small" value={s1.email} onChange={(e) => setS1({ ...s1, email: e.target.value })} />
            <TextField label="Phone *" size="small" value={s1.phone} onChange={(e) => setS1({ ...s1, phone: e.target.value })} />
            <TextField label="DOB" type="date" size="small" InputLabelProps={{ shrink: true }} value={s1.dob} onChange={(e) => setS1({ ...s1, dob: e.target.value })} />
          </Box>
          <Typography variant="subtitle2">Identity</Typography>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField label="Aadhar number *" size="small" value={s2.aadhar_number} onChange={(e) => setS2({ ...s2, aadhar_number: e.target.value })} />
            <TextField label="PAN number *" size="small" value={s2.pan_number} onChange={(e) => setS2({ ...s2, pan_number: e.target.value })} />
          </Box>
          <MediaPickerField label="Passport photo *" value={s2.passport_photo_url} onChange={(url) => setS2({ ...s2, passport_photo_url: url })} folder="/hosts/photo" />
          <Typography variant="subtitle2">Verification</Typography>
          <MediaPickerField label="Police verification document *" value={s3.police_verification_url} onChange={(url) => setS3({ ...s3, police_verification_url: url })} folder="/hosts/docs" />
          <TextField label="Full address *" size="small" multiline minRows={2} value={s3.full_address} onChange={(e) => setS3({ ...s3, full_address: e.target.value })} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cancel</Button>
        <Button onClick={() => save(true)} disabled={busy}>Save Draft</Button>
        <Button variant="contained" onClick={() => save(false)} disabled={busy}>Submit for Review</Button>
      </DialogActions>
    </Dialog>
  );
}
