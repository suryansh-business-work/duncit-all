import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import * as yup from 'yup';
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
import VenueAccordionForm from './VenueAccordionForm';
import { validateVenueCreate } from './venue.form';

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
    if (busy) return;
    reset();
    onClose();
  };

  const save = async (asDraft: boolean) => {
    setError('');
    const step1 = { ...s1, capacity: Number(s1.capacity) || 1 };
    const step2 = {
      documents: docs.filter((d) => d.type && d.url),
      gstin: s2.gstin.trim().toUpperCase(),
      pan: s2.pan.trim().toUpperCase(),
    };
    try {
      await validateVenueCreate({
        owner_user_id: owner?.user_id ?? '',
        step1,
        step2,
        step3: s3,
      });
    } catch (validationError) {
      if (validationError instanceof yup.ValidationError) {
        return setError(validationError.errors[0] ?? 'Check the highlighted fields');
      }
      return setError('Check the highlighted fields');
    }
    setBusy(true);
    try {
      await submit({
        variables: {
          owner_user_id: owner.user_id,
          step1,
          step2,
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
          <VenueAccordionForm
            mode="create"
            s1={s1}
            setS1={setS1}
            docs={docs}
            setDocs={setDocs}
            s2={s2}
            setS2={setS2}
            s3={s3}
            setS3={setS3}
            owner={owner}
            setOwner={setOwner}
            ownerOptions={usersData?.users ?? []}
            locations={locationsData?.locations ?? []}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={busy}>
          Cancel
        </Button>
        <Button
          onClick={() => save(true)}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={14} /> : undefined}
        >
          Save Draft
        </Button>
        <Button
          variant="contained"
          onClick={() => save(false)}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={14} /> : undefined}
        >
          Submit for Review
        </Button>
      </DialogActions>
    </Dialog>
  );
}
