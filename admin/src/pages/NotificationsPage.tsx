import { useState } from 'react';
import { notifyError } from '../components/notify';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PublicIcon from '@mui/icons-material/Public';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MapIcon from '@mui/icons-material/Map';
import PersonIcon from '@mui/icons-material/Person';
import MediaPickerField from '../components/MediaPickerField';

const NOTIFS = gql`
  query Notifications($limit: Int) {
    notifications(limit: $limit) {
      id
      title
      body
      image_url
      link_url
      scope
      location_id
      zone_name
      target_user_ids
      delivered_count
      failed_count
      created_at
    }
  }
`;
const LOCATIONS = gql`
  query LocationsForNotif {
    locations {
      id
      location_name
      location_zones {
        zone_name
      }
    }
  }
`;
const USERS = gql`
  query UsersForNotif {
    users {
      id
      full_name
      email
      phone_number
    }
  }
`;
const CREATE = gql`
  mutation CreateNotification($input: CreateNotificationInput!) {
    createNotification(input: $input) {
      id
      delivered_count
      failed_count
    }
  }
`;
const DELETE = gql`
  mutation DeleteNotification($id: ID!) {
    deleteNotification(notification_doc_id: $id)
  }
`;

const SCOPES = [
  { value: 'GLOBAL', label: 'All users (Global)', icon: <PublicIcon fontSize="small" /> },
  { value: 'LOCATION', label: 'By Location', icon: <LocationOnIcon fontSize="small" /> },
  { value: 'ZONE', label: 'By Zone', icon: <MapIcon fontSize="small" /> },
  { value: 'USER', label: 'Specific Users', icon: <PersonIcon fontSize="small" /> },
];

interface NotifForm {
  title: string;
  body: string;
  image_url: string;
  link_url: string;
  scope: 'GLOBAL' | 'LOCATION' | 'ZONE' | 'USER';
  silent: boolean;
  location_id: string;
  zone_name: string;
  target_user_ids: string[];
}
const blank: NotifForm = {
  title: '',
  body: '',
  image_url: '',
  link_url: '',
  scope: 'GLOBAL',
  silent: false,
  location_id: '',
  zone_name: '',
  target_user_ids: [],
};

export default function NotificationsPage() {
  const { data, loading, error, refetch } = useQuery(NOTIFS, {
    variables: { limit: 100 },
    fetchPolicy: 'cache-and-network',
  });
  const { data: locsData } = useQuery(LOCATIONS);
  const { data: usersData } = useQuery(USERS);

  const [createMut] = useMutation(CREATE);
  const [deleteMut] = useMutation(DELETE);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NotifForm>(blank);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const locations = locsData?.locations ?? [];
  const users = usersData?.users ?? [];
  const locName = (id?: string | null) => locations.find((l: any) => l.id === id)?.location_name ?? '—';
  const selLoc = locations.find((l: any) => l.id === form.location_id);
  const zones: { zone_name: string }[] = selLoc?.location_zones ?? [];

  const openCreate = () => {
    setForm(blank);
    setOpError(null);
    setOpen(true);
  };

  const submit = async () => {
    setBusy(true);
    setOpError(null);
    try {
      if (!form.title.trim()) throw new Error('Title required');
      if (!form.body.trim()) throw new Error('Body required');
      if (form.scope === 'LOCATION' && !form.location_id) throw new Error('Pick a location');
      if (form.scope === 'ZONE' && (!form.location_id || !form.zone_name))
        throw new Error('Pick location and zone');
      if (form.scope === 'USER' && form.target_user_ids.length === 0)
        throw new Error('Pick at least one user');

      const payload: any = {
        title: form.title,
        body: form.body,
        image_url: form.image_url || null,
        link_url: form.link_url || null,
        scope: form.scope,
        silent: form.silent,
        location_id: form.scope === 'GLOBAL' || form.scope === 'USER' ? null : form.location_id,
        zone_name: form.scope === 'ZONE' ? form.zone_name : null,
        target_user_ids: form.scope === 'USER' ? form.target_user_ids : [],
      };
      const res = await createMut({ variables: { input: payload } });
      const c = res.data?.createNotification;
      setToast(`Sent · delivered ${c?.delivered_count ?? 0} · failed ${c?.failed_count ?? 0}`);
      setOpen(false);
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (n: any) => {
    if (!confirm(`Delete notification "${n.title}"?`)) return;
    try {
      await deleteMut({ variables: { id: n.id } });
      setToast('Deleted');
      await refetch();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  const scopeChip = (n: any) => {
    const meta = SCOPES.find((s) => s.value === n.scope);
    let label = meta?.label ?? n.scope;
    if (n.scope === 'LOCATION') label = `Location · ${locName(n.location_id)}`;
    if (n.scope === 'ZONE') label = `Zone · ${locName(n.location_id)} / ${n.zone_name}`;
    if (n.scope === 'USER') label = `Users · ${n.target_user_ids?.length ?? 0}`;
    return (
      <Chip
        size="small"
        icon={meta?.icon}
        label={label}
        color={n.scope === 'GLOBAL' ? 'primary' : 'default'}
        variant="outlined"
      />
    );
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <NotificationsActiveIcon color="primary" />
            <Typography variant="h5">Notifications</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Send push + in-app notifications to all users, a city, a zone, or specific users.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Notification
        </Button>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading && !data ? (
            <Stack alignItems="center" sx={{ p: 4 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Body</TableCell>
                  <TableCell>Audience</TableCell>
                  <TableCell>Delivered</TableCell>
                  <TableCell>Failed</TableCell>
                  <TableCell>Sent</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.notifications ?? []).map((n: any) => (
                  <TableRow key={n.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {n.title}
                      </Typography>
                      {n.link_url && (
                        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                          → {n.link_url}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ maxWidth: 280, display: 'inline-block' }}>
                        {n.body}
                      </Typography>
                    </TableCell>
                    <TableCell>{scopeChip(n)}</TableCell>
                    <TableCell>
                      <Chip size="small" color="success" label={n.delivered_count} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" color={n.failed_count ? 'warning' : 'default'} label={n.failed_count} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {new Date(n.created_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => remove(n)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.notifications?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          No notifications yet
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Notification</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {opError && <Alert severity="error">{opError}</Alert>}
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Body"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              required
              multiline
              minRows={3}
              fullWidth
            />
            <MediaPickerField
              label="Image URL (optional)"
              value={form.image_url}
              onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
              folder="/notifications"
            />
            <TextField
              label="Link URL (optional, e.g. /pods/abc)"
              value={form.link_url}
              onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.silent}
                  onChange={(e) => setForm((f) => ({ ...f, silent: e.target.checked }))}
                />
              }
              label="Silent (in-app only — no push alert)"
            />
            <TextField
              select
              label="Audience"
              value={form.scope}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  scope: e.target.value as NotifForm['scope'],
                  location_id: '',
                  zone_name: '',
                  target_user_ids: [],
                }))
              }
              fullWidth
            >
              {SCOPES.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>

            {(form.scope === 'LOCATION' || form.scope === 'ZONE') && (
              <TextField
                select
                label="Location"
                value={form.location_id}
                onChange={(e) => setForm((f) => ({ ...f, location_id: e.target.value, zone_name: '' }))}
                fullWidth
              >
                {locations.map((l: any) => (
                  <MenuItem key={l.id} value={l.id}>
                    {l.location_name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {form.scope === 'ZONE' && (
              <TextField
                select
                label="Zone"
                value={form.zone_name}
                onChange={(e) => setForm((f) => ({ ...f, zone_name: e.target.value }))}
                disabled={!form.location_id}
                fullWidth
              >
                {zones.map((z) => (
                  <MenuItem key={z.zone_name} value={z.zone_name}>
                    {z.zone_name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {form.scope === 'USER' && (
              <TextField
                select
                label="Users"
                value={form.target_user_ids}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    target_user_ids:
                      typeof e.target.value === 'string'
                        ? e.target.value.split(',')
                        : (e.target.value as string[]),
                  }))
                }
                SelectProps={{ multiple: true }}
                fullWidth
              >
                {users.map((u: any) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.full_name || u.email || u.phone_number}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={busy}>
            {busy ? 'Sending…' : 'Send Now'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        onClose={() => setToast(null)}
        autoHideDuration={3500}
        message={toast}
      />
    </Stack>
  );
}
