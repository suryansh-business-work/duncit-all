import { Stack } from '@mui/material';
import { WelcomeDashboard } from '@duncit/shell';
import { appConfig } from '../config/app-config';
import HrOverview from './dashboard/HrOverview';

export default function DashboardPage() {
  return (
    <Stack spacing={3}>
      <HrOverview />
      <WelcomeDashboard
        dashboardId="hr.overview"
        name={appConfig.name}
        tagline={appConfig.tagline}
        modules={appConfig.modules ?? []}
      />
    </Stack>
  );
}
