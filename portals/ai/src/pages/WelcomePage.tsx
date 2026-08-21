import { Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import WavingHandIcon from '@mui/icons-material/WavingHand';
import { useUserData } from '@duncit/user-context';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import { appConfig } from '../config/app-config';

export default function WelcomePage() {
  const { user } = useUserData();
  const { t } = useTranslation();
  const name = user?.first_name || user?.full_name || t('ai.welcome.guest');
  // The console's name is copy, not a brand mark — "AI Portal" is a phrase a
  // reader parses, so it is substituted from the catalogue rather than taken
  // from appConfig, which nothing can translate.
  const portalLabel = t('ai.welcome.portalLabel');
  const tagline = appConfig.taglineKey ? t(appConfig.taglineKey) : appConfig.tagline;

  const widgets: DashboardWidget[] = [
    {
      id: 'greeting',
      bare: true,
      defaultLayout: { x: 0, y: 0, w: 12, h: 3 },
      minW: 4,
      minH: 2,
      content: (
        <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
              <WavingHandIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                {t('ai.welcome.greeting', { vars: { name } })}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {t('ai.welcome.body', { vars: { portal: portalLabel } })}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Chip label={portalLabel} color="primary" variant="outlined" size="small" />
              <Chip label={t('shell.welcome.comingSoon')} size="small" />
            </Stack>
          </CardContent>
        </Card>
      ),
    },
  ];

  return (
    <DuncitDashboard
      dashboardId="ai.overview"
      header={
        <PageHeader
          title={t('ai.welcome.title', { vars: { name: appConfig.fullName } })}
          subtitle={tagline}
        />
      }
      widgets={widgets}
    />
  );
}
