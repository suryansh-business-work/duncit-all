import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import {
  CHALLENGE_STATS,
  CREATE_CHALLENGE,
  UPDATE_CHALLENGE,
  type Challenge,
} from '../../graphql/challenges';
import CategoryCascade, { type CascadeValue } from './CategoryCascade';

interface Props {
  open: boolean;
  /** When set, the dialog edits this challenge; otherwise it creates a new one. */
  editing: Challenge | null;
  onClose: () => void;
  /** Called after a successful create/update (e.g. to reload the table). */
  onSaved?: () => void;
}

const emptyCascade: CascadeValue = { superId: '', categoryId: '', subId: '' };

/** Create or edit a challenge: name, description + cascading category scope. */
export default function ChallengeFormDialog({ open, editing, onClose, onSaved }: Readonly<Props>) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cascade, setCascade] = useState<CascadeValue>(emptyCascade);

  const refetchQueries = [{ query: CHALLENGE_STATS }];
  const [createChallenge, createState] = useMutation(CREATE_CHALLENGE, { refetchQueries });
  const [updateChallenge, updateState] = useMutation(UPDATE_CHALLENGE, { refetchQueries });
  const loading = createState.loading || updateState.loading;
  const error = createState.error ?? updateState.error;

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setDescription(editing?.description ?? '');
    setCascade({
      superId: editing?.super_category_id ?? '',
      categoryId: editing?.category_id ?? '',
      subId: editing?.sub_category_id ?? '',
    });
  }, [open, editing]);

  const submit = async () => {
    if (!name.trim()) return;
    const input = {
      name: name.trim(),
      description,
      super_category_id: cascade.superId || null,
      category_id: cascade.categoryId || null,
      sub_category_id: cascade.subId || null,
    };
    if (editing) {
      await updateChallenge({ variables: { id: editing.id, input } });
    } else {
      await createChallenge({ variables: { input } });
    }
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editing ? 'Edit challenge' : 'New challenge'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {error && <Alert severity="error">{error.message}</Alert>}
          <TextField
            label="Challenge name"
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            autoFocus
            required
          />
          <TextField
            label="Description"
            size="small"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={3}
          />
          <CategoryCascade value={cascade} onChange={setCascade} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={loading || !name.trim()}>
          {loading ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
