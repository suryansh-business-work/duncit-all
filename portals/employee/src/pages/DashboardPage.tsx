import { WelcomeDashboard } from '@duncit/shell';
import { appConfig } from '../config/app-config';

export default function DashboardPage() {
  return <WelcomeDashboard name={appConfig.name} tagline={appConfig.tagline} modules={appConfig.modules ?? []} />;
}
