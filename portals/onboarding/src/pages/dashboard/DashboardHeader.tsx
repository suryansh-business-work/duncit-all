import { Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import { appConfig } from '../../config/app-config';

interface Props {
  firstName: string;
  photo?: string | null;
  roles: string[];
}

/** Welcome strip above the widget grid: who is signed in and what they can do. */
export default function DashboardHeader({ firstName, photo, roles }: Readonly<Props>) {
  return (
    <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center' }}>
      <Avatar
        src={photo || undefined}
        sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontWeight: 800 }}
      >
        {firstName.charAt(0).toUpperCase()}
      </Avatar>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Welcome back, {firstName}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {appConfig.tagline}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
          {roles.map((role) => (
            <Chip
              key={role}
              label={role.replaceAll('_', ' ')}
              color="primary"
              variant="outlined"
              size="small"
            />
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}
