import { Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import WavingHandIcon from '@mui/icons-material/WavingHand';
import { PageHeader } from '@duncit/ui';
import { useUserData } from '@duncit/user-context';
import { appConfig } from '../config/app-config';

export default function WelcomePage() {
  const { user } = useUserData();
  const name = user?.first_name || user?.full_name || 'there';
  return (
    <Stack spacing={2.5}>
      <PageHeader title={`Welcome to ${appConfig.fullName}`} subtitle={appConfig.tagline} />
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
            <WavingHandIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Hi {name}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            This is the {appConfig.portalLabel}. Your console is set up and ready —
            features will appear here soon.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Chip label={appConfig.portalLabel} color="primary" variant="outlined" size="small" />
            <Chip label="Coming soon" size="small" />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
