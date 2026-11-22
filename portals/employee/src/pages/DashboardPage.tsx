import { Stack } from '@mui/material';
import { WelcomeDashboard } from '@duncit/shell';
import { appConfig } from '../config/app-config';
import { TargetReminderBanner } from './targets';

export default function DashboardPage() {
  return (
    <Stack spacing={2}>
      {/* Only renders while a monthly target is waiting for its month-end report. */}
      <TargetReminderBanner />
      <WelcomeDashboard
        dashboardId="employee.overview"
        name={appConfig.name}
        tagline={appConfig.tagline}
        modules={appConfig.modules ?? []}
      />
    </Stack>
  );
}
