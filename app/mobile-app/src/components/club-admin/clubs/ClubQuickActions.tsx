import { YStack } from 'tamagui';

import { ActionRow } from '@/components/host-manage/ActionRow';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { MenuRoute } from '@/navigation/types';

interface Props {
  onNavigate: (route: MenuRoute) => void;
}

/** The two doors out of Club Studio: the dashboard and the AI monitoring
 * trail — the same rows the sidebar's Club Admin menu carries. */
export function ClubQuickActions({ onNavigate }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary, warning } = useThemeColors();

  return (
    <YStack gap={8} testID="club-quick-actions">
      <ActionRow
        testID="club-action-dashboard"
        icon="insights"
        label={t('mweb.clubStudio.dashboardAction')}
        tint={primary}
        onPress={() => onNavigate('ClubAdminDashboard')}
      />
      <ActionRow
        testID="club-action-monitoring"
        icon="security"
        label={t('mweb.clubStudio.monitoringAction')}
        tint={warning}
        onPress={() => onNavigate('ClubPodMonitoring')}
      />
    </YStack>
  );
}
