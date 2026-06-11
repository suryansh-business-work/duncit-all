import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Avatar,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { ADMIN_ME, UPDATE_ADMIN_PROFILE, getAdminDisplayName, getAdminInitials, type AdminSessionUser } from '../../adminSession';
import AdminProfileForm, { toAdminProfileInput, type AdminProfileFormValues } from './admin-profile-form';

function buildInitialValues(user: AdminSessionUser): AdminProfileFormValues {
  return {
    first_name: user.first_name ?? '',
    last_name: user.last_name ?? '',
    phone_extension: user.phone_extension ?? '',
    phone_number: user.phone_number ?? '',
    country: user.country ?? '',
    city: user.city ?? '',
    zone: user.zone ?? '',
    bio: user.bio ?? '',
    profile_photo: user.profile_photo ?? '',
  };
}

export default function ProfilePage() {
  const { data, loading, error, refetch } = useQuery<{ me: AdminSessionUser | null }>(ADMIN_ME, {
    fetchPolicy: 'cache-and-network',
  });
  const [updateProfile] = useMutation(UPDATE_ADMIN_PROFILE);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const user = data?.me;

  const initialValues = useMemo(() => (user ? buildInitialValues(user) : null), [user]);

  const save = async (values: AdminProfileFormValues) => {
    setSaveError(null);
    try {
      await updateProfile({ variables: { input: toAdminProfileInput(values) } });
      await refetch();
      setToast('Profile updated');
    } catch (profileError: any) {
      setSaveError(profileError?.message || 'Failed to update profile');
    }
  };

  if (loading && !user) {
    return <Stack alignItems="center" sx={{ p: 6 }}><CircularProgress /></Stack>;
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!user || !initialValues) return <Alert severity="warning">Profile not found.</Alert>;

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" fontWeight={800}>Admin Profile</Typography>
        <Typography variant="body2" color="text.secondary">Manage your account details and profile photo.</Typography>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
            <CardContent>
              <Stack alignItems="center" spacing={1.5}>
                <Avatar src={user.profile_photo || undefined} sx={{ width: 104, height: 104, fontSize: 34, bgcolor: 'primary.main' }}>
                  {getAdminInitials(user)}
                </Avatar>
                <Typography variant="h6" textAlign="center">{getAdminDisplayName(user)}</Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">{user.email || 'No email set'}</Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" justifyContent="center">
                  {(user.roles ?? []).map((role) => <Chip key={role} size="small" label={role} />)}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card>
            <AdminProfileForm initialValues={initialValues} busy={loading} errorMessage={saveError} onSubmit={save} />
          </Card>
        </Grid>
      </Grid>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} message={toast ?? ''} />
    </Stack>
  );
}