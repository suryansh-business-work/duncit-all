import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Card,
  CircularProgress,
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
import UserDetailsTabs from './UserDetailsTabs';
import RolesSection from './RolesSection';
import DeleteUserDialog from './DeleteUserDialog';
import UserHealthSection from './UserHealthSection';
import UserVerificationsSection from './UserVerificationsSection';
import UserSurveysSection from './UserSurveysSection';
import UserChangeLogsSection from './UserChangeLogsSection';
import { useUserDetailsState } from './useUserDetailsState';
import { useTranslation } from '@duncit/shell';

export default function UserDetailsPage() {
  const { t } = useTranslation();
  const { user_id } = useParams();
  const [toast, setToast] = useState<string | null>(null);
  const [contactType, setContactType] = useState<'CALL' | 'EMAIL' | null>(null);
  const [contactRefresh, setContactRefresh] = useState(0);
  const s = useUserDetailsState(user_id, setToast);

  if (s.loading && !s.user) {
    return (
      <Stack
        sx={{
          alignItems: "center",
          p: 6
        }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (s.error) return <Alert severity="error">{s.error.message}</Alert>;
  if (!s.user || !s.form) return <Alert severity="warning">{t('admin.users.notFound')}</Alert>;

  const userId = s.user.user_id || user_id || '';

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

      <UserSummaryCard
        user={s.user}
        form={s.form}
        busy={s.busy}
        onPhotoChange={s.updatePhoto}
      />

      <UserDetailsTabs
        tabs={[
          {
            value: 'profile',
            label: t('admin.profile.tab'),
            content: (
            <Card sx={{ height: '100%' }}>
              <ProfileForm
                form={s.form}
                busy={s.busy}
                opError={s.opError}
                onSave={s.save}
              />
            </Card>
            ),
          },
          { value: 'interests', label: t('admin.tabs.interests'), content: <UserInterestsSection user={s.user} /> },
          {
            value: 'access',
            label: t('admin.tabs.access'),
            content: (
              <Stack spacing={2}>
                <RolesSection user={s.user} roleByKey={s.roleByKey} onManageRoles={s.openRoles} />
              </Stack>
            ),
          },
          { value: 'badges', label: t('admin.tabs.badges'), content: <UserBadgesSection userId={userId} /> },
          { value: 'verification', label: t('admin.tabs.verification'), content: <UserVerificationsSection userId={userId} /> },
          { value: 'surveys', label: t('admin.tabs.surveys'), content: <UserSurveysSection userId={userId} /> },
          { value: 'health', label: t('admin.tabs.health'), content: <UserHealthSection userId={userId} /> },
          { value: 'activity', label: t('admin.tabs.activity'), content: <UserActivitySection userId={userId} /> },
          {
            value: 'contact-logs',
            label: t('admin.tabs.callEmailLogs'),
            content: <ContactActionsSection userId={userId} refreshToken={contactRefresh} />,
          },
          {
            value: 'change-logs',
            label: t('admin.profile.changeLogs'),
            content: <UserChangeLogsSection userId={userId} />,
          },
        ]}
      />

      <ContactActionDialog
        open={!!contactType}
        type={contactType ?? 'CALL'}
        user={s.user}
        onClose={() => setContactType(null)}
        onSaved={() => {
          setToast(t('admin.contact.saved'));
          setContactRefresh((value) => value + 1);
        }}
      />

      <RolesDialog
        open={s.rolesOpen}
        onClose={() => s.setRolesOpen(false)}
        selectedRoles={s.selectedRoles}
        toggleRole={s.toggleRole}
        saveRoles={s.saveRoles}
        busy={s.busy}
        hostProfile={s.hostProfile}
        hostCategories={s.hostCategories}
        setHostCategories={s.setHostCategories}
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
