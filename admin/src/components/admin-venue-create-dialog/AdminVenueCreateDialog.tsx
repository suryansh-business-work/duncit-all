import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ADMIN_CREATE_VENUE,
  LOCATIONS_FOR_VENUE,
  USERS,
  blankS1,
  blankS3,
  type DocEntry,
  type Step1,
  type Step3,
} from './queries';
import VenueDetailsSection from './VenueDetailsSection';
import VenueDocsSection from './VenueDocsSection';
import VenueOwnerSection from './VenueOwnerSection';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AdminVenueCreateDialog({ open, onClose, onSaved }: Props) {
  const { data: usersData } = useQuery(USERS, { skip: !open });
  const { data: locationsData } = useQuery(LOCATIONS_FOR_VENUE, { skip: !open });
  const [owner, setOwner] = useState<any | null>(null);
  const [s1, setS1] = useState<Step1>(blankS1);
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [s2, setS2] = useState({ gstin: '', pan: '' });
  const [s3, setS3] = useState<Step3>(blankS3);
  const [error, setError] = useState('');
  const [submit] = useMutation(ADMIN_CREATE_VENUE);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setOwner(null);
    setS1(blankS1);
    setDocs([]);
    setS2({ gstin: '', pan: '' });
    setS3(blankS3);
    setError('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const save = async (asDraft: boolean) => {
    setError('');
    if (!owner) return setError('Select an owner user');
    if (!s1.venue_name || !s1.address_line1 || !s1.location_id || !s1.country_code || !s1.state || !s1.city || !s1.locality || !s1.postal_code)
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
          <VenueDetailsSection s1={s1} setS1={setS1} locations={locationsData?.locations ?? []} />
          <VenueDocsSection docs={docs} setDocs={setDocs} s2={s2} setS2={setS2} />
          <VenueOwnerSection s3={s3} setS3={setS3} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cancel</Button>
        <Button onClick={() => save(true)} disabled={busy}>Save Draft</Button>
        <Button variant="contained" onClick={() => save(false)} disabled={busy}>
          Submit for Review
        </Button>
      </DialogActions>
    </Dialog>
  );
}
