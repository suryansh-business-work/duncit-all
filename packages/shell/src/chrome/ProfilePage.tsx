import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import EditIcon from '@mui/icons-material/Edit';
import { useUserData } from '@duncit/user-context';
import { useBranding } from '../hooks/useBranding';
import { accountEmail, accountName, initials } from './user-display';

const UPDATE_MY_PROFILE = gql`
  mutation ShellUpdateMyProfile($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      user_id
      first_name
      last_name
      full_name
      email
      profile_photo
      roles
    }
  }
`;

function humaniseRole(role: string): string {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Shared, editable profile page for every portal — shows the signed-in
 * account's identity + access roles and lets the user edit their name. Mounted
 * by each portal at `/profile` and opened from the header avatar menu, so
 * profile management is identical across all consoles.
 */
export function ProfilePage() {
  const { user, refetch, logout } = useUserData();
  const branding = useBranding();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saved, setSaved] = useState(false);
  const [save, { loading, error }] = useMutation(UPDATE_MY_PROFILE);

  const name = accountName(user, 'User');
  const email = accountEmail(user);
  const roles = user?.roles ?? [];

  const startEdit = () => {
    setFirstName(user?.first_name ?? '');
    setLastName(user?.last_name ?? '');
    setSaved(false);
    setEditing(true);
  };

  const submit = async () => {
    await save({ variables: { input: { first_name: firstName.trim(), last_name: lastName.trim() } } });
    await refetch();
    setEditing(false);
    setSaved(true);
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" fontWeight={800} mb={2}>
        Your profile
      </Typography>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <Avatar
            src={user?.profile_photo || undefined}
            sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: 28, fontWeight: 800 }}
          >
            {initials(user, 'U')}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h6" fontWeight={800} noWrap>
              {name}
            </Typography>
            <Typography color="text.secondary" noWrap>
              {email || '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Signed in to {branding.appName || 'Duncit'}
            </Typography>
          </Box>
          {!editing && (
            <Button size="small" startIcon={<EditIcon />} onClick={startEdit} sx={{ fontWeight: 800 }}>
              Edit
            </Button>
          )}
        </Stack>

        <Divider sx={{ my: 2.5 }} />

        {editing ? (
          <Stack spacing={2}>
            <TextField label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} fullWidth size="small" />
            <TextField label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} fullWidth size="small" />
            {error && <Alert severity="error">{error.message}</Alert>}
            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" onClick={submit} disabled={loading} sx={{ borderRadius: 999, fontWeight: 800 }}>
                {loading ? 'Saving…' : 'Save changes'}
              </Button>
              <Button onClick={() => setEditing(false)} disabled={loading} sx={{ borderRadius: 999, fontWeight: 800 }}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        ) : (
          <>
            {saved && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Profile updated.
              </Alert>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: 0.4 }}>
              ACCESS ROLES
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              {roles.length > 0 ? (
                roles.map((role) => <Chip key={role} label={humaniseRole(role)} size="small" />)
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No roles assigned.
                </Typography>
              )}
            </Stack>
          </>
        )}

        <Divider sx={{ my: 2.5 }} />

        <Button
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={logout}
          sx={{ borderRadius: 999, fontWeight: 800 }}
        >
          Log out
        </Button>
      </Paper>
    </Container>
  );
}
