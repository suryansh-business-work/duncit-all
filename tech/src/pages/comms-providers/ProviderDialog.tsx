import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import type { CommsProvider, CommsProviderType } from './queries';

interface FormState {
  name: string;
  type: CommsProviderType;
  description: string;
  is_default: boolean;
  is_active: boolean;
  host: string;
  port: string;
  user: string;
  password: string;
  secure: boolean;
  from_address: string;
  from_name: string;
  reply_to: string;
  base_url: string;
  api_key: string;
  sender_email: string;
  sender_name: string;
  caller_id: string;
}

const EMPTY: FormState = {
  name: '',
  type: 'SMTP',
  description: '',
  is_default: false,
  is_active: true,
  host: '',
  port: '587',
  user: '',
  password: '',
  secure: false,
  from_address: '',
  from_name: '',
  reply_to: '',
  base_url: '',
  api_key: '',
  sender_email: '',
  sender_name: '',
  caller_id: '',
};

const TYPE_OPTIONS: { value: CommsProviderType; label: string }[] = [
  { value: 'SMTP', label: 'SMTP (Email)' },
  { value: 'VOBIZ_EMAIL', label: 'Vobiz Email' },
  { value: 'VOBIZ_CALL', label: 'Vobiz Call' },
];

interface Props {
  open: boolean;
  initial?: CommsProvider | null;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    type: CommsProviderType;
    description: string;
    is_default: boolean;
    is_active: boolean;
    config: Record<string, any>;
  }) => Promise<void> | void;
}

export default function ProviderDialog({ open, initial, busy, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        type: initial.type,
        description: initial.description ?? '',
        is_default: initial.is_default,
        is_active: initial.is_active,
        host: initial.config.host ?? '',
        port: initial.config.port ? String(initial.config.port) : '',
        user: initial.config.user ?? '',
        password: '',
        secure: initial.config.secure,
        from_address: initial.config.from_address ?? '',
        from_name: initial.config.from_name ?? '',
        reply_to: initial.config.reply_to ?? '',
        base_url: initial.config.base_url ?? '',
        api_key: '',
        sender_email: initial.config.sender_email ?? '',
        sender_name: initial.config.sender_name ?? '',
        caller_id: initial.config.caller_id ?? '',
      });
    } else {
      setForm(EMPTY);
    }
    setError(null);
  }, [initial, open]);

  const set = <K extends keyof FormState>(key: K) => (value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const isSmtp = form.type === 'SMTP';
  const title = initial ? `Edit ${initial.name}` : 'New communication provider';

  const submit = async () => {
    setError(null);
    if (!form.name.trim()) return setError('Name is required');
    const config: Record<string, any> = {};
    if (isSmtp) {
      if (!form.host) return setError('SMTP host is required');
      config.host = form.host;
      config.port = Number(form.port) || 587;
      config.user = form.user;
      if (form.password) config.password = form.password;
      config.secure = form.secure;
      config.from_address = form.from_address;
      config.from_name = form.from_name;
      config.reply_to = form.reply_to;
    } else {
      if (!form.base_url) return setError('Base URL is required');
      config.base_url = form.base_url;
      if (form.api_key) config.api_key = form.api_key;
      config.sender_email = form.sender_email;
      config.sender_name = form.sender_name;
      config.caller_id = form.caller_id;
    }
    await onSubmit({
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim(),
      is_default: form.is_default,
      is_active: form.is_active,
      config,
    });
  };

  const secretHelper = useMemo(() => {
    if (!initial) return 'Required';
    if (isSmtp) return initial.config.has_password ? 'Leave blank to keep existing password' : 'Required';
    return initial.config.has_api_key ? 'Leave blank to keep existing API key' : 'Required';
  }, [initial, isSmtp]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField label="Name" value={form.name} onChange={(e) => set('name')(e.target.value)} fullWidth required />
            <FormControl fullWidth disabled={!!initial}>
              <InputLabel>Type</InputLabel>
              <Select label="Type" value={form.type} onChange={(e) => set('type')(e.target.value as CommsProviderType)}>
                {TYPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <TextField label="Description" value={form.description} onChange={(e) => set('description')(e.target.value)} fullWidth multiline minRows={2} />
          <Stack direction="row" spacing={2}>
            <FormControlLabel control={<Switch checked={form.is_default} onChange={(e) => set('is_default')(e.target.checked)} />} label="Default for this type" />
            <FormControlLabel control={<Switch checked={form.is_active} onChange={(e) => set('is_active')(e.target.checked)} />} label="Active" />
          </Stack>
          {isSmtp ? (
            <>
              <Typography variant="overline" color="text.secondary" sx={{ pt: 1 }}>SMTP CONFIG</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField label="Host" value={form.host} onChange={(e) => set('host')(e.target.value)} fullWidth required />
                <TextField label="Port" value={form.port} onChange={(e) => set('port')(e.target.value)} type="number" sx={{ width: { sm: 120 } }} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField label="Username" value={form.user} onChange={(e) => set('user')(e.target.value)} fullWidth />
                <TextField label="Password" value={form.password} onChange={(e) => set('password')(e.target.value)} type="password" fullWidth helperText={secretHelper} />
              </Stack>
              <FormControlLabel control={<Switch checked={form.secure} onChange={(e) => set('secure')(e.target.checked)} />} label="Use TLS (port 465)" />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField label="From address" value={form.from_address} onChange={(e) => set('from_address')(e.target.value)} fullWidth />
                <TextField label="From name" value={form.from_name} onChange={(e) => set('from_name')(e.target.value)} fullWidth />
              </Stack>
              <TextField label="Reply-to" value={form.reply_to} onChange={(e) => set('reply_to')(e.target.value)} fullWidth />
            </>
          ) : (
            <>
              <Typography variant="overline" color="text.secondary" sx={{ pt: 1 }}>VOBIZ CONFIG</Typography>
              <TextField label="Base URL" value={form.base_url} onChange={(e) => set('base_url')(e.target.value)} fullWidth required />
              <TextField label="API key" value={form.api_key} onChange={(e) => set('api_key')(e.target.value)} type="password" fullWidth helperText={secretHelper} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField label="Sender email" value={form.sender_email} onChange={(e) => set('sender_email')(e.target.value)} fullWidth />
                <TextField label="Sender name" value={form.sender_name} onChange={(e) => set('sender_name')(e.target.value)} fullWidth />
              </Stack>
              <TextField label="Caller ID / from-number" value={form.caller_id} onChange={(e) => set('caller_id')(e.target.value)} fullWidth />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}
