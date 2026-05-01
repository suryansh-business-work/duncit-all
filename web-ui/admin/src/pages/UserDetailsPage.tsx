import { useEffect, useMemo, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Avatar,
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
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  Link,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import VerifiedIcon from '@mui/icons-material/Verified';
import SaveIcon from '@mui/icons-material/Save';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import MediaPickerField from '../components/MediaPickerField';

const USER = gql`
  query AdminUser($user_id: ID!) {
    user(user_id: $user_id) {
      user_id
      first_name
      last_name
      full_name
      email
      is_email_verified
      phone_number
      phone_extension
      is_phone_verified
      country
      city
      zone
      assigned_city
      assigned_zones
      profile_photo
      bio
      status
      roles
      permissions
      dob
      created_at
      updated_at
    }
    roles {
      id
      key
      name
      description
      is_system
    }
  }
`;

const UPDATE_USER = gql`
  mutation UpdateUser($user_id: ID!, $input: UpdateUserInput!) {
    updateUser(user_id: $user_id, input: $input) {
      user_id
      first_name
      last_name
      full_name
      email
      phone_number
      phone_extension
      city
      zone
      bio
      profile_photo
      status
      assigned_city
      assigned_zones
    }
  }
`;

const ASSIGN_ROLES = gql`
  mutation AssignUserRoles($user_id: ID!, $role_keys: [String!]!) {
    assignUserRoles(user_id: $user_id, role_keys: $role_keys) {
      user_id
      roles
      permissions
    }
  }
`;

const DELETE_USER = gql`
  mutation DeleteUser($user_id: ID!) {
    deleteUser(user_id: $user_id)
  }
`;

const Section = styled(Card)({ height: '100%' });

interface EditForm {
  first_name: string;
  last_name: string;
  email: string;
  phone_extension: string;
  phone_number: string;
  city: string;
  zone: string;
  assigned_city: string;
  assigned_zones: string;
  bio: string;
  profile_photo: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

const STATUS_META: Record<EditForm['status'], { color: 'success' | 'default' | 'error'; label: string }> = {
  ACTIVE: { color: 'success', label: 'Active' },
  INACTIVE: { color: 'default', label: 'Inactive' },
  SUSPENDED: { color: 'error', label: 'Blocked' },
};

export default function UserDetailsPage() {
  const { user_id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery(USER, {
    variables: { user_id },
    skip: !user_id,
    fetchPolicy: 'cache-and-network',
  });
  const [updateUser] = useMutation(UPDATE_USER);
  const [assign] = useMutation(ASSIGN_ROLES);
  const [deleteUser] = useMutation(DELETE_USER);

  const [form, setForm] = useState<EditForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Roles dialog
  const [rolesOpen, setRolesOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());

  // Delete confirm
  const [delOpen, setDelOpen] = useState(false);

  const user = data?.user;
  const allRoles = data?.roles ?? [];

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
        email: user.email ?? '',
        phone_extension: user.phone_extension ?? '',
        phone_number: user.phone_number ?? '',
        city: user.city ?? '',
        zone: user.zone ?? '',
        assigned_city: user.assigned_city ?? '',
        assigned_zones: (user.assigned_zones ?? []).join(', '),
        bio: user.bio ?? '',
        profile_photo: user.profile_photo ?? '',
        status: (user.status ?? 'ACTIVE') as EditForm['status'],
      });
    }
  }, [user]);

  const roleByKey = useMemo(() => {
    const m: Record<string, any> = {};
    for (const r of allRoles) m[r.key] = r;
    return m;
  }, [allRoles]);

  const dirty = useMemo(() => {
    if (!user || !form) return false;
    return (
      form.first_name !== (user.first_name ?? '') ||
      form.last_name !== (user.last_name ?? '') ||
      form.email !== (user.email ?? '') ||
      form.phone_extension !== (user.phone_extension ?? '') ||
      form.phone_number !== (user.phone_number ?? '') ||
      form.city !== (user.city ?? '') ||
      form.zone !== (user.zone ?? '') ||
      form.assigned_city !== (user.assigned_city ?? '') ||
      form.assigned_zones !== (user.assigned_zones ?? []).join(', ') ||
      form.bio !== (user.bio ?? '') ||
      form.profile_photo !== (user.profile_photo ?? '') ||
      form.status !== (user.status ?? 'ACTIVE')
    );
  }, [form, user]);

  const save = async () => {
    if (!user_id || !form) return;
    setBusy(true);
    setOpError(null);
    try {
      const input: any = {
        first_name: form.first_name,
        last_name: form.last_name,
        phone_extension: form.phone_extension,
        phone_number: form.phone_number,
        city: form.city || undefined,
        zone: form.zone || undefined,
        assigned_city: form.assigned_city || undefined,
        assigned_zones: form.assigned_zones
          ? form.assigned_zones.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        bio: form.bio || undefined,
        profile_photo: form.profile_photo || undefined,
        status: form.status,
      };
      if (form.email) input.email = form.email;
      await updateUser({ variables: { user_id, input } });
      setToast('User updated');
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: EditForm['status']) => {
    if (!user_id) return;
    setBusy(true);
    setOpError(null);
    try {
      await updateUser({ variables: { user_id, input: { status } } });
      setForm((p) => (p ? { ...p, status } : p));
      setToast(`Status set to ${STATUS_META[status].label}`);
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const openRoles = () => {
    const next = new Set<string>(user?.roles ?? []);
    next.add('USER');
    setSelectedRoles(next);
    setRolesOpen(true);
  };
  const toggleRole = (key: string) => {
    if (key === 'USER') return; // USER role is mandatory
    setSelectedRoles((p) => {
      const n = new Set(p);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };
  const saveRoles = async () => {
    if (!user_id) return;
    setBusy(true);
    setOpError(null);
    try {
      const keys = Array.from(selectedRoles);
      if (!keys.includes('USER')) keys.push('USER');
      await assign({ variables: { user_id, role_keys: keys } });
      setRolesOpen(false);
      setToast('Roles updated');
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!user_id) return;
    setBusy(true);
    try {
      await deleteUser({ variables: { user_id } });
      navigate('/users');
    } catch (e: any) {
      setOpError(e.message);
      setBusy(false);
    }
  };

  if (loading && !user) {
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!user || !form) return <Alert severity="warning">User not found.</Alert>;

  const statusMeta = STATUS_META[form.status];

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton onClick={() => navigate('/users')} aria-label="back">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            <Link component={RouterLink} to="/users" underline="hover" color="inherit">
              Users
            </Link>{' '}
            / Details
          </Typography>
          <Typography variant="h5">{user.full_name || user.email || user.user_id}</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {form.status !== 'ACTIVE' && (
            <Button
              size="small"
              variant="outlined"
              color="success"
              startIcon={<CheckCircleIcon />}
              disabled={busy}
              onClick={() => setStatus('ACTIVE')}
            >
              Activate
            </Button>
          )}
          {form.status !== 'INACTIVE' && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<PauseCircleIcon />}
              disabled={busy}
              onClick={() => setStatus('INACTIVE')}
            >
              Deactivate
            </Button>
          )}
          {form.status !== 'SUSPENDED' ? (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<BlockIcon />}
              disabled={busy}
              onClick={() => setStatus('SUSPENDED')}
            >
              Block
            </Button>
          ) : (
            <Button
              size="small"
              variant="outlined"
              color="success"
              startIcon={<CheckCircleIcon />}
              disabled={busy}
              onClick={() => setStatus('ACTIVE')}
            >
              Unblock
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            disabled={busy}
            onClick={() => setDelOpen(true)}
          >
            Delete
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Section>
            <CardContent>
              <Stack alignItems="center" spacing={1.5}>
                <Avatar
                  src={form.profile_photo || undefined}
                  sx={{ width: 96, height: 96, fontSize: 36, bgcolor: 'primary.main' }}
                >
                  {(form.first_name?.[0] ?? '?').toUpperCase()}
                </Avatar>
                <Typography variant="h6">
                  {form.first_name} {form.last_name}
                </Typography>
                <Chip size="small" label={statusMeta.label} color={statusMeta.color} />
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <EmailIcon fontSize="small" color="action" />
                  <Typography variant="body2">{user.email ?? '—'}</Typography>
                  {user.is_email_verified && (
                    <Tooltip title="Verified">
                      <VerifiedIcon fontSize="inherit" color="success" />
                    </Tooltip>
                  )}
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <PhoneIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {user.phone_extension} {user.phone_number}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Created {user.created_at ? new Date(user.created_at).toLocaleString() : '—'}
                </Typography>
              </Stack>
            </CardContent>
          </Section>
        </Grid>

        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            <Section>
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  <Typography variant="subtitle1">Profile</Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<SaveIcon />}
                    onClick={save}
                    disabled={busy || !dirty}
                  >
                    {busy ? 'Saving…' : 'Save Changes'}
                  </Button>
                </Stack>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="First name"
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Last name"
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={4} sm={3}>
                    <TextField
                      label="Ext."
                      value={form.phone_extension}
                      onChange={(e) => setForm({ ...form, phone_extension: e.target.value })}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={8} sm={9}>
                    <TextField
                      label="Phone number"
                      value={form.phone_number}
                      onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="City"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Zone"
                      value={form.zone}
                      onChange={(e) => setForm({ ...form, zone: e.target.value })}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Assigned city (admin scope)"
                      value={form.assigned_city}
                      onChange={(e) => setForm({ ...form, assigned_city: e.target.value })}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Assigned zones (comma-separated)"
                      value={form.assigned_zones}
                      onChange={(e) => setForm({ ...form, assigned_zones: e.target.value })}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <MediaPickerField
                      label="Profile photo URL"
                      value={form.profile_photo}
                      onChange={(url) => setForm({ ...form, profile_photo: url })}
                      folder="/users"
                      showPreview={false}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Bio"
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      fullWidth
                      multiline
                      minRows={3}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Status"
                      select
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value as EditForm['status'] })
                      }
                      fullWidth
                    >
                      <MenuItem value="ACTIVE">Active</MenuItem>
                      <MenuItem value="INACTIVE">Inactive</MenuItem>
                      <MenuItem value="SUSPENDED">Blocked</MenuItem>
                    </TextField>
                  </Grid>
                  {opError && (
                    <Grid item xs={12}>
                      <Alert severity="error">{opError}</Alert>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Section>

            <Section>
              <CardContent>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 2 }}
                >
                  <Box>
                    <Typography variant="subtitle1">Roles</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Roles determine what this user can do.
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<ManageAccountsIcon />}
                    onClick={openRoles}
                  >
                    Manage Roles
                  </Button>
                </Stack>
                {(user.roles ?? []).length === 0 ? (
                  <Alert severity="warning">No roles assigned.</Alert>
                ) : (
                  <Stack direction="row" sx={{ gap: 1 }} flexWrap="wrap">
                    {user.roles.map((r: string) => (
                      <Chip
                        key={r}
                        label={roleByKey[r]?.name ?? r}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Section>

            <Section>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Effective Permissions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Computed from the user's assigned roles.
                </Typography>
                {(user.permissions ?? []).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No permissions.
                  </Typography>
                ) : (
                  <Stack direction="row" sx={{ gap: 1 }} flexWrap="wrap">
                    {user.permissions.map((p: string) => (
                      <Chip key={p} label={p} size="small" variant="outlined" />
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Section>
          </Stack>
        </Grid>
      </Grid>

      {/* Roles dialog */}
      <Dialog open={rolesOpen} onClose={() => setRolesOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Manage Roles</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {allRoles.length === 0 && <Alert severity="info">No roles defined yet.</Alert>}
            {allRoles.map((r: any) => (
              <Card key={r.id} variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={2}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {r.name}{' '}
                        {r.is_system && (
                          <Chip
                            size="small"
                            label="system"
                            sx={{ ml: 0.5, height: 18 }}
                            color="info"
                          />
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.key}
                        {r.description ? ` · ${r.description}` : ''}
                      </Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={r.key === 'USER' ? true : selectedRoles.has(r.key)}
                          disabled={r.key === 'USER'}
                          onChange={() => toggleRole(r.key)}
                        />
                      }
                      label={r.key === 'USER' ? 'Required' : ''}
                      labelPlacement="start"
                      sx={{ mr: 0, '& .MuiFormControlLabel-label': { fontSize: 11, color: 'text.secondary' } }}
                    />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRolesOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveRoles} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={delOpen} onClose={() => setDelOpen(false)}>
        <DialogTitle>Delete this user?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This action permanently removes the account. It cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={doDelete} disabled={busy}>
            Delete User
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
