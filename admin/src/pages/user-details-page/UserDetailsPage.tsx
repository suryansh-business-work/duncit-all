import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
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
  Grid,
  IconButton,
  Link,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import VerifiedIcon from '@mui/icons-material/Verified';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  USER,
  UPDATE_USER,
  ASSIGN_ROLES,
  DELETE_USER,
  STATUS_META,
  EditForm,
} from './queries';
import RolesDialog from './RolesDialog';
import ProfileForm from './ProfileForm';
import UserBadgesSection from './UserBadgesSection';
import UserInterestsSection from './UserInterestsSection';

const Section = styled(Card)({ height: '100%' });

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

  const [rolesOpen, setRolesOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
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
          ? form.assigned_zones
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
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
    if (key === 'USER') return;
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
          <Typography variant="h5">
            {user.full_name || user.email || user.user_id}
          </Typography>
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
                  Created{' '}
                  {user.created_at ? new Date(user.created_at).toLocaleString() : '—'}
                </Typography>
              </Stack>
            </CardContent>
          </Section>
        </Grid>

        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            <Section>
              <ProfileForm
                form={form}
                setForm={setForm}
                busy={busy}
                dirty={dirty}
                opError={opError}
                onSave={save}
              />
            </Section>

            <UserInterestsSection user={user} />

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

            <UserBadgesSection userId={user.user_id || user_id || ''} />
          </Stack>
        </Grid>
      </Grid>

      <RolesDialog
        open={rolesOpen}
        onClose={() => setRolesOpen(false)}
        allRoles={allRoles}
        selectedRoles={selectedRoles}
        toggleRole={toggleRole}
        saveRoles={saveRoles}
        busy={busy}
      />

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
