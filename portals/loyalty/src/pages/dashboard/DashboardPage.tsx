import { Box, Typography } from '@mui/material';
import { WelcomeDashboard } from '@duncit/shell';
import { useTranslation } from '@duncit/app-settings';
import { appConfig } from '../../config/app-config';
import LoyaltyKpis from './LoyaltyKpis';

/** The Loyalty console's home: the welcome card and the reward liability across all three books. */
export default function DashboardPage() {
  const { t } = useTranslation();
  return (
    <WelcomeDashboard dashboardId="loyalty.overview" name={appConfig.name} tagline={t('shell.portal.loyalty.tagline')}>
      <Box>
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          {t('loyalty.dashboard.overviewTitle')}
        </Typography>
        <LoyaltyKpis />
      </Box>
    </WelcomeDashboard>
  );
}
