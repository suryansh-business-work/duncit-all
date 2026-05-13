import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Card,
  CircularProgress,
  Grid,
  Snackbar,
  Stack,
} from '@mui/material';
import RolesDialog from './RolesDialog';
import ProfileForm from './ProfileForm';
import UserBadgesSection from './UserBadgesSection';
import UserActivitySection from './UserActivitySection';
import ContactActionDialog from './ContactActionDialog';
import ContactActionsSection from './ContactActionsSection';
import UserInterestsSection from './UserInterestsSection';
import UserHeader from './UserHeader';
import UserSummaryCard from './UserSummaryCard';
import RolesSection from './RolesSection';
import PermissionsSection from './PermissionsSection';
import DeleteUserDialog from './DeleteUserDialog';
import { useUserDetailsState } from './useUserDetailsState';

export default function UserDetailsPage() {
  const { user_id } = useParams();
  const [toast, setToast] = useState<string | null>(null);
  const [contactType, setContactType] = useState<'CALL' | 'EMAIL' | null>(null);
  const [contactRefresh, setContactRefresh] = useState(0);
  const s = useUserDetailsState(user_id, setToast);

  if (s.loading && !s.user) {
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (s.error) return <Alert severity="error">{s.error.message}</Alert>;
  if (!s.user || !s.form) return <Alert severity="warning">User not found.</Alert>;

  return (
    <Stack spacing={3}>
      <UserHeader
        user={s.user}
        status={s.form.status}
        busy={s.busy}
        setStatus={s.setStatus}
        onCallClick={() => setContactType('CALL')}
        onEmailClick={() => setContactType('EMAIL')}
        onDeleteClick={() => s.setDelOpen(true)}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <UserSummaryCard user={s.user} form={s.form} />
        </Grid>

        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            <Card sx={{ height: '100%' }}>
              <ProfileForm
                form={s.form}
                busy={s.busy}
                opError={s.opError}
                onSave={s.save}
              />
            </Card>

            <UserInterestsSection user={s.user} />

            <RolesSection
              user={s.user}
              roleByKey={s.roleByKey}
              onManageRoles={s.openRoles}
            />

            <PermissionsSection user={s.user} />

            <UserBadgesSection userId={s.user.user_id || user_id || ''} />

            <UserActivitySection userId={s.user.user_id || user_id || ''} />

            <ContactActionsSection
              userId={s.user.user_id || user_id || ''}
              refreshToken={contactRefresh}
            />
          </Stack>
        </Grid>
      </Grid>

      <ContactActionDialog
        open={!!contactType}
        type={contactType ?? 'CALL'}
        user={s.user}
        onClose={() => setContactType(null)}
        onSaved={() => {
          setToast('Contact log saved');
          setContactRefresh((value) => value + 1);
        }}
      />

      <RolesDialog
        open={s.rolesOpen}
        onClose={() => s.setRolesOpen(false)}
        allRoles={s.allRoles}
        selectedRoles={s.selectedRoles}
        toggleRole={s.toggleRole}
        saveRoles={s.saveRoles}
        busy={s.busy}
      />

      <DeleteUserDialog
        open={s.delOpen}
        busy={s.busy}
        onClose={() => s.setDelOpen(false)}
        onConfirm={s.doDelete}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
