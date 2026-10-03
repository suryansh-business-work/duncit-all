import { Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';
import { ProfileSection } from './ProfileSection';

function humaniseRole(role: string): string {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** The access roles the account holds. Read-only: roles are granted by an admin. */
export function ProfileRoles({ roles }: Readonly<{ roles: readonly string[] }>) {
  const { t } = useTranslation();
  return (
    <ProfileSection testId="profile-roles" title={t('shell.profile.accessRolesTitle')}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {roles.length > 0 ? (
          roles.map((role) => <Chip key={role} data-testid={`profile-role-${role}`} label={humaniseRole(role)} size="small" />)
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('shell.profile.noRoles')}
          </Typography>
        )}
      </Stack>
    </ProfileSection>
  );
}
