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
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import MediaPickerField from './MediaPickerField';

const USERS = gql`
  query UsersForVenueCreate {
    users {
      user_id
      full_name
      email
      phone_number
    }
  }
`;

const ADMIN_CREATE_VENUE = gql`
  mutation AdminCreateVenue(
    $owner_user_id: ID!
    $step1: VenueStep1Input!
    $step2: VenueStep2Input!
    $step3: VenueStep3Input!
    $submit: Boolean
  ) {
    adminCreateVenue(
      owner_user_id: $owner_user_id
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

const VENUE_TYPES = ['Cafe', 'Co-working', 'Restaurant', 'Park', 'Studio', 'Other'];
const DOC_TYPES = ['GST Certificate', 'PAN Card', 'Property Document', 'Trade License', 'Other'];

export default function AdminVenueCreateDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: usersData } = useQuery(USERS, { skip: !open });
  const [owner, setOwner] = useState<any | null>(null);
  const [s1, setS1] = useState({
    venue_name: '',
    venue_type: 'Cafe',
    capacity: 10,
    description: '',
    cover_image_url: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
  });
  const [docs, setDocs] = useState<{ type: string; url: string }[]>([]);
  const [s2, setS2] = useState({ gstin: '', pan: '' });
  const [s3, setS3] = useState({
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    owner_dob: '',
    owner_address: '',
  });
  const [error, setError] = useState('');
  const [submit] = useMutation(ADMIN_CREATE_VENUE);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setOwner(null);
    setS1({
      venue_name: '',
      venue_type: 'Cafe',
      capacity: 10,
      description: '',
      cover_image_url: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
    });
    setDocs([]);
    setS2({ gstin: '', pan: '' });
    setS3({ owner_name: '', owner_email: '', owner_phone: '', owner_dob: '', owner_address: '' });
    setError('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const save = async (asDraft: boolean) => {
    setError('');
    if (!owner) return setError('Select an owner user');
    if (!s1.venue_name || !s1.address_line1 || !s1.city || !s1.state || !s1.postal_code)
      return setError('Fill required venue details');
    if (!s3.owner_name || !s3.owner_email || !s3.owner_phone)
      return setError('Fill required owner details');
    setBusy(true);
    try {
      await submit({
        variables: {
          owner_user_id: owner.user_id,
          step1: { ...s1, capacity: Number(s1.capacity) || 1 },
          step2: {
            documents: docs.filter((d) => d.type && d.url),
            gstin: s2.gstin,
            pan: s2.pan,
          },
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
    <Dialog open={open} onClose={close} fullWidth maxWidth="md">
      <DialogTitle>Create Venue (on behalf)</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Typography color="error">{error}</Typography>}

          <Autocomplete
            options={usersData?.users ?? []}
            getOptionLabel={(o: any) => `${o.full_name} · ${o.email || o.phone_number || ''}`}
            value={owner}
            onChange={(_, v) => setOwner(v)}
            renderInput={(params) => <TextField {...params} label="Owner user *" size="small" />}
          />

          <Typography variant="subtitle2">Venue details</Typography>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField label="Venue name *" size="small" value={s1.venue_name} onChange={(e) => setS1({ ...s1, venue_name: e.target.value })} />
            <TextField select label="Type" size="small" value={s1.venue_type} onChange={(e) => setS1({ ...s1, venue_type: e.target.value })}>
              {VENUE_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField label="Capacity" type="number" size="small" value={s1.capacity} onChange={(e) => setS1({ ...s1, capacity: Number(e.target.value) })} />
            <TextField label="City *" size="small" value={s1.city} onChange={(e) => setS1({ ...s1, city: e.target.value })} />
            <TextField label="State *" size="small" value={s1.state} onChange={(e) => setS1({ ...s1, state: e.target.value })} />
            <TextField label="Postal code *" size="small" value={s1.postal_code} onChange={(e) => setS1({ ...s1, postal_code: e.target.value })} />
            <TextField sx={{ gridColumn: '1 / -1' }} label="Address line 1 *" size="small" value={s1.address_line1} onChange={(e) => setS1({ ...s1, address_line1: e.target.value })} />
            <TextField sx={{ gridColumn: '1 / -1' }} label="Address line 2" size="small" value={s1.address_line2} onChange={(e) => setS1({ ...s1, address_line2: e.target.value })} />
            <TextField sx={{ gridColumn: '1 / -1' }} label="Description" size="small" multiline minRows={2} value={s1.description} onChange={(e) => setS1({ ...s1, description: e.target.value })} />
          </Box>
          <MediaPickerField label="Cover image" value={s1.cover_image_url} onChange={(url) => setS1({ ...s1, cover_image_url: url })} folder="/venues/cover" />

          <Typography variant="subtitle2">Documents</Typography>
          <Stack spacing={1}>
            {docs.map((d, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <TextField select size="small" label="Type" value={d.type} sx={{ minWidth: 180 }} onChange={(e) => setDocs(docs.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))}>
                  {DOC_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
                <Box sx={{ flex: 1 }}>
                  <MediaPickerField label="File" value={d.url} onChange={(url) => setDocs(docs.map((x, j) => (j === i ? { ...x, url } : x)))} folder="/venues/docs" />
                </Box>
                <IconButton onClick={() => setDocs(docs.filter((_, j) => j !== i))}><DeleteIcon /></IconButton>
              </Stack>
            ))}
            <Button onClick={() => setDocs([...docs, { type: 'GST Certificate', url: '' }])}>Add document</Button>
          </Stack>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField label="GSTIN" size="small" value={s2.gstin} onChange={(e) => setS2({ ...s2, gstin: e.target.value })} />
            <TextField label="PAN" size="small" value={s2.pan} onChange={(e) => setS2({ ...s2, pan: e.target.value })} />
          </Box>

          <Typography variant="subtitle2">Owner</Typography>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField label="Owner name *" size="small" value={s3.owner_name} onChange={(e) => setS3({ ...s3, owner_name: e.target.value })} />
            <TextField label="Owner email *" size="small" value={s3.owner_email} onChange={(e) => setS3({ ...s3, owner_email: e.target.value })} />
            <TextField label="Owner phone *" size="small" value={s3.owner_phone} onChange={(e) => setS3({ ...s3, owner_phone: e.target.value })} />
            <TextField label="DOB" type="date" size="small" InputLabelProps={{ shrink: true }} value={s3.owner_dob} onChange={(e) => setS3({ ...s3, owner_dob: e.target.value })} />
            <TextField sx={{ gridColumn: '1 / -1' }} label="Owner address" size="small" value={s3.owner_address} onChange={(e) => setS3({ ...s3, owner_address: e.target.value })} />
          </Box>
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
