import { Box, Typography } from '@mui/material';
import { WelcomeDashboard } from '@duncit/shell';
import { appConfig } from '../config/app-config';
import { FinanceKpis } from './finance/dashboard';

export default function DashboardPage() {
  return (
    <WelcomeDashboard name={appConfig.name} tagline={appConfig.tagline}>
      <Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          {appConfig.name} overview
        </Typography>
        <FinanceKpis />
      </Box>
    </WelcomeDashboard>
  );
}
