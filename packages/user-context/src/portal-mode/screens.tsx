import { Box, Stack, Typography } from '@mui/material';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

interface ScreenProps {
  /** Friendly app name shown in the heading. */
  appName?: string;
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

export function MaintenanceScreen({ appName }: Readonly<ScreenProps>) {
  return (
    <Shell
      icon={<BuildCircleIcon sx={{ fontSize: 72 }} color="warning" />}
      title="We’ll be back soon"
      subtitle={`${appName ?? 'This service'} is temporarily down for maintenance. Please check back in a little while.`}
    />
  );
}

export function UnderDevelopmentScreen({ appName }: Readonly<ScreenProps>) {
  return (
    <Shell
      icon={<RocketLaunchIcon sx={{ fontSize: 72 }} color="info" />}
      title="Under development"
      subtitle={`${appName ?? 'This service'} is being built and isn’t available yet. It will go live soon.`}
    />
  );
}
