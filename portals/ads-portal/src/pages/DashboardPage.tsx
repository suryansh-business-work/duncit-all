import { WelcomeDashboard } from '@duncit/shell';
import { appConfig } from '../config/app-config';
import AdsOverview from './dashboard';

/** Greeting header from the shared shell, with the live ads overview as its body. */
export default function DashboardPage() {
  return (
    <WelcomeDashboard name={appConfig.name} tagline={appConfig.tagline}>
      <AdsOverview />
    </WelcomeDashboard>
  );
}
