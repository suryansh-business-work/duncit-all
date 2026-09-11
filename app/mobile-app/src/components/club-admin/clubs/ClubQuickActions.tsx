import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import type { MenuRoute } from '@/navigation/types';
import { NavRow, RowDivider } from '../NavRow';

interface Props {
  onNavigate: (route: MenuRoute) => void;
}

/** The two doors out of Club Studio: the dashboard and the AI monitoring
 * trail — the same rows the sidebar's Club Admin menu carries, as one list
 * card. */
export function ClubQuickActions({ onNavigate }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <SurfaceCard padding={0} overflow="hidden" testID="club-quick-actions">
      <NavRow
        testID="club-action-dashboard"
        icon="space-dashboard"
        label={t('mweb.clubStudio.dashboardAction')}
        onPress={() => onNavigate('ClubAdminDashboard')}
      />
      <RowDivider />
      <NavRow
        testID="club-action-monitoring"
        icon="monitor-heart"
        label={t('mweb.clubStudio.monitoringAction')}
        onPress={() => onNavigate('ClubPodMonitoring')}
      />
    </SurfaceCard>
  );
}
