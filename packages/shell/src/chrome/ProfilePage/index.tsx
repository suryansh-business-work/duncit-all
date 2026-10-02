import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Container, Divider, Paper, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { DuncitButton } from '@duncit/buttons';
import { useUserData } from '@duncit/user-context';
import { useBranding } from '../../hooks/useBranding';
import { useTranslation } from '../../i18n/useTranslation';
import { ProfileLanguage } from '../ProfileLanguage';
import { ProfileEditForm } from './ProfileEditForm';
import { ProfileIdentity } from './ProfileIdentity';
import { ProfileRoles } from './ProfileRoles';
import { MY_CONNECTED_ACCOUNTS, UPDATE_MY_PROFILE } from './queries';

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
  const [save, { loading, error }] = useMutation<any>(UPDATE_MY_PROFILE);

  const roles = user?.roles ?? [];
  const { data: connected } = useQuery<any>(MY_CONNECTED_ACCOUNTS);
  const googleEmail: string | null = connected?.myConnectedAccounts?.google?.google_email ?? null;

  const startEdit = () => {
    setFirstName(user?.first_name ?? '');
    setLastName(user?.last_name ?? '');
    setSaved(false);
    setEditing(true);
  };

  const submit = async () => {
    try {
      await save({ variables: { input: { first_name: firstName.trim(), last_name: lastName.trim() } } });
      await refetch();
      setEditing(false);
      setSaved(true);
    } catch {
      // `error`, read above, is what renders the failure.
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 4 } }}>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 800,
          mb: 2
        }}>
        {t('shell.profile.title')}
      </Typography>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
        <ProfileIdentity
          user={user}
          googleEmail={googleEmail}
          appName={branding.appName || 'Duncit'}
          editing={editing}
          onEdit={startEdit}
        />

        <Divider sx={{ my: 2.5 }} />

        {editing ? (
          <ProfileEditForm
            firstName={firstName}
            lastName={lastName}
            onFirstName={setFirstName}
            onLastName={setLastName}
            loading={loading}
            error={error}
            onSubmit={submit}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <ProfileRoles saved={saved} roles={roles} />
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
