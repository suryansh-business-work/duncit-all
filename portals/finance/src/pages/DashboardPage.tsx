import { Box, Typography } from '@mui/material';
import { WelcomeDashboard } from '@duncit/shell';
import { appConfig } from '../config/app-config';
import { FinanceKpis } from './finance/dashboard';

export default function DashboardPage() {
  return (
    <WelcomeDashboard dashboardId="finance.overview" name={appConfig.name} tagline={appConfig.tagline}>
      <Box>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            mb: 1.5
          }}>
          {appConfig.name} overview
        </Typography>
        <FinanceKpis />
      </Box>
    </WelcomeDashboard>
  );
}
