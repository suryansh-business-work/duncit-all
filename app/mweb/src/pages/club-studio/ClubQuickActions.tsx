import MonitorHeartRoundedIcon from '@mui/icons-material/MonitorHeartRounded';
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded';
import QuickActionList, { type QuickAction } from '../../components/club-admin/QuickActionList';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Club Studio's quick actions: the dashboard and the AI pod monitor — the
 * same two doors the drawer's Club Admin menu opens. Native twin (rule 27).
 */
export default function ClubQuickActions() {
  const { t } = useTranslation();
  const actions: QuickAction[] = [
    {
      key: 'dashboard',
      icon: <SpaceDashboardRoundedIcon fontSize="small" />,
      label: t('mweb.clubStudio.dashboardAction'),
      to: '/clubs/dashboard',
    },
    {
      key: 'monitoring',
      icon: <MonitorHeartRoundedIcon fontSize="small" />,
      label: t('mweb.clubStudio.monitoringAction'),
      to: '/clubs/monitoring',
    },
  ];
  return <QuickActionList actions={actions} testId="club-quick-actions" />;
}
