import { WelcomeDashboard } from '@duncit/shell';
import { appConfig } from '../config/app-config';

export default function DashboardPage() {
  return (
    <WelcomeDashboard
      dashboardId="hr.overview"
      name={appConfig.name}
      tagline={appConfig.tagline}
      modules={appConfig.modules ?? []}
    />
  );
}
