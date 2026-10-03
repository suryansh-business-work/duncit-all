import { Avatar, Box, Stack, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import { accountEmail, accountName, initials, type ShellUser } from '../user-display';

interface Props {
  user: ShellUser;
  /** The product name from branding, read by the page that owns the query. */
  appName: string;
  onLogout: () => void;
}

/** Who is signed in — avatar, name, e-mail — and the way out. */
export function ProfileIdentity({ user, appName, onLogout }: Readonly<Props>) {
  const { t } = useTranslation();
  const email = accountEmail(user);

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}>
      <Avatar
        src={user?.profile_photo || undefined}
        alt=""
        sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: 28, fontWeight: 800 }}
      >
        {initials(user, 'U')}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography component="h1" variant="h6" noWrap sx={{ fontWeight: 800 }}>
          {accountName(user, t('shell.profile.fallbackName'))}
        </Typography>
        <Typography noWrap sx={{ color: 'text.secondary' }}>
          {email || t('shell.profile.noEmail')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('shell.profile.signedInTo', { vars: { app: appName } })}
        </Typography>
      </Box>
      <DuncitButton variant="outlined" color="error" startIcon={<LogoutIcon />} onClick={onLogout} data-testid="profile-logout">
        {t('shell.profile.logout')}
      </DuncitButton>
    </Stack>
  );
}
