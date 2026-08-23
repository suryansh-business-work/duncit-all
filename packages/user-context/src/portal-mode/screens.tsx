import { Box, Stack, Typography } from '@mui/material';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { sessionT, type SessionTranslate } from '../i18n';

interface ScreenProps {
  /** Friendly app name shown in the heading. */
  appName?: string;
  /** The mounting surface's translator; the shipped English when omitted. */
  t?: SessionTranslate;
}

const Shell = ({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) => (
  <Box
    sx={{
      minHeight: '100dvh',
      display: 'grid',
      placeItems: 'center',
      p: 3,
      bgcolor: 'background.default',
      textAlign: 'center',
    }}
  >
    <Stack spacing={2} alignItems="center" sx={{ maxWidth: 480 }}>
      {icon}
      <Typography variant="h4" fontWeight={800}>{title}</Typography>
      <Typography variant="body1" color="text.secondary">{subtitle}</Typography>
    </Stack>
  </Box>
);

export function MaintenanceScreen({ appName, t = sessionT }: Readonly<ScreenProps>) {
  const app = appName ?? t('session.portalMode.thisService');
  return (
    <Shell
      icon={<BuildCircleIcon sx={{ fontSize: 72 }} color="warning" />}
      title={t('session.portalMode.maintenanceTitle')}
      subtitle={t('session.portalMode.maintenanceBody', { vars: { app } })}
    />
  );
}

export function UnderDevelopmentScreen({ appName, t = sessionT }: Readonly<ScreenProps>) {
  const app = appName ?? t('session.portalMode.thisService');
  return (
    <Shell
      icon={<RocketLaunchIcon sx={{ fontSize: 72 }} color="info" />}
      title={t('session.portalMode.developmentTitle')}
      subtitle={t('session.portalMode.developmentBody', { vars: { app } })}
    />
  );
}
