import { useMemo } from 'react';
import { Box, Container, Paper, Stack } from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { useUserData } from '@duncit/user-context';
import { useBranding } from '../../hooks/useBranding';
import { useTranslation } from '../../i18n/useTranslation';
import type { Translate } from '../../i18n/fallback';
import { DetailsTab } from './details/DetailsTab';
import { NotificationsTab } from './notifications/NotificationsTab';
import { ProfileIdentity } from './ProfileIdentity';
import { SecurityTab } from './security/SecurityTab';

type ProfileTab = 'profile' | 'security' | 'notifications';

const TAB_ID_PREFIX = 'profile';

function buildTabs(t: Translate): DuncitTabItem<ProfileTab>[] {
  return [
    { value: 'profile', label: t('shell.profile.tabs.profile'), icon: <PersonOutlineIcon />, iconPosition: 'start', testId: 'profile-tab-profile' },
    { value: 'security', label: t('shell.profile.tabs.security'), icon: <LockOutlinedIcon />, iconPosition: 'start', testId: 'profile-tab-security' },
    {
      value: 'notifications',
      label: t('shell.profile.tabs.notifications'),
      icon: <NotificationsNoneOutlinedIcon />,
      iconPosition: 'start',
      testId: 'profile-tab-notifications',
    },
  ];
}

/**
 * Shared profile page for every portal — mounted by each at `/profile` and
 * opened from the header avatar menu, so account management is identical
 * across all consoles.
 *
 * Three tabs, selected through the URL so a link can open one directly:
 * Profile (photo, name, bio, links, privacy, language, roles), Security
 * (password with an emailed OTP, sign-in activity, sign out everywhere) and
 * Notifications (email, WhatsApp, where codes are sent). Every switch and form
 * here writes through the same server rules mWeb and the app use.
 */
export function ProfilePage() {
  const { t } = useTranslation();
  const { user, logout } = useUserData();
  const branding = useBranding();
  const items = useMemo(() => buildTabs(t), [t]);
  const tabs = useTabParam<ProfileTab>({ items, fallback: 'profile' });

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <ProfileIdentity user={user} appName={branding.appName || 'Duncit'} onLogout={logout} />
        </Paper>
        <DuncitTabs
          {...tabs}
          idPrefix={TAB_ID_PREFIX}
          searchable={false}
          variant="scrollable"
          scrollButtons="auto"
          aria-label={t('shell.profile.title')}
        />
        <Box {...tabPanelProps(TAB_ID_PREFIX, tabs.value)}>
          {tabs.value === 'profile' && <DetailsTab roles={user?.roles ?? []} />}
          {tabs.value === 'security' && <SecurityTab onSignedOut={logout} />}
          {tabs.value === 'notifications' && <NotificationsTab />}
        </Box>
      </Stack>
    </Container>
  );
}
