import { WelcomeDashboard } from '@duncit/shell';
import { appConfig } from '../config/app-config';

export default function DashboardPage() {
  return (
    <WelcomeDashboard
      dashboardId="employee.overview"
      name={appConfig.name}
      tagline={appConfig.tagline}
      modules={appConfig.modules ?? []}
    />
  );
}
