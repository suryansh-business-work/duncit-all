import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Avatar,
  Box,
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
import GoogleIcon from '@mui/icons-material/Google';
import { DuncitButton } from '@duncit/buttons';
import { useUserData } from '@duncit/user-context';
import { useBranding } from '../hooks/useBranding';
import { accountEmail, accountName, initials } from './user-display';
import { useTranslation } from '../i18n/useTranslation';
import { ProfileLanguage } from './ProfileLanguage';

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

/** The signed-in account's linked Gmail, if any. Its own query because the
 * password hash it reports on is select:false and so invisible to the user
 * mapper the shell's session already holds. */
const MY_CONNECTED_ACCOUNTS = gql`
  query ShellMyConnectedAccounts {
    myConnectedAccounts {
      google {
        google_email
      }
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
  const { t } = useTranslation();
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
  const { data: connected } = useQuery(MY_CONNECTED_ACCOUNTS);
  const googleEmail: string | null = connected?.myConnectedAccounts?.google?.google_email ?? null;

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
      <Typography
        variant="h5"
        sx={{
          fontWeight: 800,
          mb: 2
        }}>
        Your profile
      </Typography>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{
          alignItems: { xs: 'flex-start', sm: 'center' }
        }}>
          <Avatar
            src={user?.profile_photo || undefined}
            sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: 28, fontWeight: 800 }}
          >
            {initials(user, 'U')}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h6" noWrap sx={{
              fontWeight: 800
            }}>
              {name}
            </Typography>
            <Typography noWrap sx={{
              color: "text.secondary"
            }}>
              {email || '—'}
            </Typography>
            {/* Read-only on purpose: the consoles sign in with a password or an
                emailed code, never with Google, so there is nothing to connect
                here. What the line answers is "which Gmail also opens this
                account", which mWeb and the app can grant. */}
            {googleEmail && (
              <Stack
                direction="row"
                spacing={0.5}
                sx={{
                  alignItems: "center",
                  minWidth: 0
                }}>
                <GoogleIcon sx={{ fontSize: 14, color: '#4285f4' }} />
                <Typography variant="caption" noWrap sx={{
                  color: "text.secondary"
                }}>
                  {googleEmail}
                </Typography>
              </Stack>
            )}
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              Signed in to {branding.appName || 'Duncit'}
            </Typography>
          </Box>
          {!editing && (
            <DuncitButton size="small" startIcon={<EditIcon />} onClick={startEdit} sx={{ fontWeight: 800 }}>
              Edit
            </DuncitButton>
          )}
        </Stack>

        <Divider sx={{ my: 2.5 }} />

        {editing ? (
          <Stack spacing={2}>
            <TextField label={t('shell.profile.firstName')} value={firstName} onChange={(e) => setFirstName(e.target.value)} fullWidth size="small" />
            <TextField label={t('shell.profile.lastName')} value={lastName} onChange={(e) => setLastName(e.target.value)} fullWidth size="small" />
            {error && <Alert severity="error">{error.message}</Alert>}
            <Stack direction="row" spacing={1.5}>
              <DuncitButton variant="contained" onClick={submit} disabled={loading} sx={{ borderRadius: 999, fontWeight: 800 }}>
                {loading ? 'Saving…' : 'Save changes'}
              </DuncitButton>
              <DuncitButton onClick={() => setEditing(false)} disabled={loading} sx={{ borderRadius: 999, fontWeight: 800 }}>
                Cancel
              </DuncitButton>
            </Stack>
          </Stack>
        ) : (
          <>
            {saved && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Profile updated.
              </Alert>
            )}
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 800,
                letterSpacing: 0.4
              }}>
              {t('shell.profile.accessRoles')}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{
                flexWrap: "wrap",
                mt: 1
              }}>
              {roles.length > 0 ? (
                roles.map((role) => <Chip key={role} label={humaniseRole(role)} size="small" />)
              ) : (
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  {t('shell.profile.noRoles')}
                </Typography>
              )}
            </Stack>
          </>
        )}

        <ProfileLanguage />

        <Divider sx={{ my: 2.5 }} />

        <DuncitButton
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={logout}
          sx={{ borderRadius: 999, fontWeight: 800 }}
        >
          Log out
        </DuncitButton>
      </Paper>
    </Container>
  );
}
