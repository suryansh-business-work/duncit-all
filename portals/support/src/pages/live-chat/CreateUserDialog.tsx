import { useState } from 'react';
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
import { SUPPORT_CREATE_USER } from '../../graphql/supportChat';

interface Props {
  open: boolean;
  onClose: () => void;
}

const EMPTY = { first_name: '', last_name: '', email: '', phone_extension: '', phone_number: '', password: '' };

/** Lets a support agent create a user account on a caller's behalf. */
export default function CreateUserDialog({ open, onClose }: Readonly<Props>) {
  const [form, setForm] = useState(EMPTY);
  const [done, setDone] = useState('');
  const [createUser, { loading, error }] = useMutation(SUPPORT_CREATE_USER);

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    const { data } = await createUser({
      variables: {
        input: {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim() || null,
          email: form.email.trim(),
          phone_extension: form.phone_extension.trim() || null,
          phone_number: form.phone_number.trim() || null,
          password: form.password,
        },
      },
    });
    setDone(data?.supportCreateUser?.email ?? '');
    setForm(EMPTY);
  };

  const close = () => {
    setDone('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>Create user account</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          {done && <Alert severity="success">Account created for {done}.</Alert>}
          {error && <Alert severity="error">{error.message}</Alert>}
          <TextField label="First name" size="small" value={form.first_name} onChange={set('first_name')} required />
          <TextField label="Last name" size="small" value={form.last_name} onChange={set('last_name')} />
          <TextField label="Email" size="small" type="email" value={form.email} onChange={set('email')} required />
          <Stack direction="row" spacing={1}>
            <TextField label="Ext" size="small" sx={{ width: 90 }} value={form.phone_extension} onChange={set('phone_extension')} />
            <TextField label="Phone (optional)" size="small" fullWidth value={form.phone_number} onChange={set('phone_number')} />
          </Stack>
          <TextField label="Temporary password" size="small" type="password" value={form.password} onChange={set('password')} required helperText="Min 8 characters — share it with the user securely." />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Close</Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={loading || !form.first_name.trim() || !form.email.trim() || form.password.length < 8}
        >
          Create account
        </Button>
      </DialogActions>
    </Dialog>
  );
}
