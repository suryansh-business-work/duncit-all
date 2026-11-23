import { WelcomeDashboard, useTranslation } from '@duncit/shell';
import { appConfig } from '../../config/app-config';
import TargetsOverview from './TargetsOverview';

/** The shared greeting and account card, with where the console's targets stand as its body. */
export default function TargetsDashboardPage() {
  const { t } = useTranslation();
  return (
    <WelcomeDashboard
      dashboardId={`${appConfig.key}.overview`}
      name={appConfig.name}
      tagline={t(appConfig.taglineKey)}
      modules={appConfig.modules}
    >
      <TargetsOverview />
    </WelcomeDashboard>
  );
}
