import { Alert, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';

function humaniseRole(role: string): string {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

interface Props {
  /** A save just landed — say so above the roles. */
  saved: boolean;
  roles: readonly string[];
}

/** The access roles the account holds, under the "saved" confirmation. */
export function ProfileRoles({ saved, roles }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
      {saved && (
        <Alert data-testid="profile-saved" severity="success" sx={{ mb: 2 }}>
          {t('shell.profile.updated')}
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
          roles.map((role) => <Chip key={role} data-testid={`profile-role-${role}`} label={humaniseRole(role)} size="small" />)
        ) : (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('shell.profile.noRoles')}
          </Typography>
        )}
      </Stack>
    </>
  );
}
